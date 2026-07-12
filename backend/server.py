from dotenv import load_dotenv
from pathlib import Path
ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

import os
import logging
from typing import List, Optional
from datetime import datetime, timezone
from collections import defaultdict

from fastapi import FastAPI, APIRouter, HTTPException, Request, Depends, Response
from fastapi.responses import JSONResponse
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient

from models import (
    LoginRequest, RegisterRequest, UserPublic, Department,
    EmissionFactor, CarbonTransaction, SustainabilityGoal,
    CSRActivity, DiversityMetric,
    ESGPolicy, Audit, ComplianceIssue,
    Challenge, Badge, Reward, RewardRedemption,
    Notification, Activity,
    AIChatRequest, AIReportRequest, AICompliancePayload,
    Category, EmployeeParticipation, ChallengeParticipation,
    PolicyAcknowledgement, ESGConfig, NotificationSettings,
    new_id, now_iso,
)
from auth import (
    hash_password, verify_password, create_access_token,
    decode_token, get_token_from_request,
)
from seed import seed_all
import ai_service

logger = logging.getLogger("ecosphere")
logging.basicConfig(level=logging.INFO)

# ---------- DB ----------
mongo_url = os.environ["MONGO_URL"]
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ["DB_NAME"]]

app = FastAPI(title="EcoSphere ESG Platform API")
api = APIRouter(prefix="/api")


# ---------- helpers ----------
async def current_user(request: Request) -> dict:
    token = get_token_from_request(request)
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    payload = decode_token(token)
    user = await db.users.find_one({"id": payload["sub"]}, {"_id": 0, "password_hash": 0})
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    return user


def strip_id(doc):
    if doc and "_id" in doc:
        doc.pop("_id", None)
    return doc


def set_auth_cookie(response: Response, token: str):
    response.set_cookie(
        key="access_token", value=token, httponly=True, secure=True,
        samesite="none", max_age=60 * 60 * 24 * 7, path="/",
    )


# ---------- STARTUP ----------
@app.on_event("startup")
async def startup():
    await db.users.create_index("email", unique=True)
    await seed_all(db)
    logger.info("EcoSphere seed complete.")


# ---------- AUTH ----------
@api.post("/auth/register")
async def register(req: RegisterRequest, response: Response):
    email = req.email.lower()
    if await db.users.find_one({"email": email}):
        raise HTTPException(status_code=400, detail="Email already registered")
    user = {
        "id": new_id(),
        "email": email,
        "password_hash": hash_password(req.password),
        "name": req.name,
        "role": req.role if req.role in ["admin", "manager", "employee"] else "employee",
        "department": req.department,
        "avatar": None,
        "xp": 0, "level": 1, "eco_coins": 100, "streak": 0, "badges": [],
        "created_at": now_iso(),
    }
    await db.users.insert_one(user)
    token = create_access_token(user["id"], email, user["role"])
    set_auth_cookie(response, token)
    user.pop("password_hash", None)
    strip_id(user)
    return {"user": user, "token": token}


@api.post("/auth/login")
async def login(req: LoginRequest, response: Response):
    email = req.email.lower()
    user = await db.users.find_one({"email": email})
    if not user or not verify_password(req.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    token = create_access_token(user["id"], email, user["role"])
    set_auth_cookie(response, token)
    user.pop("password_hash", None)
    strip_id(user)
    return {"user": user, "token": token}


@api.post("/auth/logout")
async def logout(response: Response):
    response.delete_cookie("access_token", path="/")
    return {"ok": True}


@api.get("/auth/me")
async def me(user: dict = Depends(current_user)):
    return user


# ---------- DASHBOARD ----------
@api.get("/dashboard/overview")
async def dashboard_overview(user: dict = Depends(current_user)):
    await flag_overdue_compliance_issues(db)
    await compute_and_save_department_scores(db)
    depts = await db.departments.find({}, {"_id": 0}).to_list(100)
    total_e = sum(d["e_score"] for d in depts) / max(len(depts), 1)
    total_s = sum(d["s_score"] for d in depts) / max(len(depts), 1)
    total_g = sum(d["g_score"] for d in depts) / max(len(depts), 1)
    esg_score = round((total_e + total_s + total_g) / 3, 1)

    total_co2 = 0
    async for t in db.carbon_transactions.find({}, {"_id": 0, "co2e_kg": 1}):
        total_co2 += t["co2e_kg"]

    total_users = await db.users.count_documents({})
    csr_hours = 0
    async for a in db.csr_activities.find({"status": "approved"}, {"_id": 0, "hours": 1}):
        csr_hours += a["hours"]

    open_issues = await db.compliance_issues.count_documents({"status": {"$ne": "resolved"}})
    active_challenges = await db.challenges.count_documents({"status": "active"})

    return {
        "esg_score": esg_score,
        "e_score": round(total_e, 1),
        "s_score": round(total_s, 1),
        "g_score": round(total_g, 1),
        "total_co2e_kg": round(total_co2, 2),
        "trees_equivalent": round(total_co2 / 21, 0),  # ~21kg CO2/tree/year
        "total_users": total_users,
        "csr_hours": csr_hours,
        "open_compliance_issues": open_issues,
        "active_challenges": active_challenges,
    }


@api.get("/dashboard/departments")
async def dashboard_departments(user: dict = Depends(current_user)):
    await compute_and_save_department_scores(db)
    depts = await db.departments.find({}, {"_id": 0}).sort("esg_score", -1).to_list(100)
    # attach rank delta: prev_rank - new_rank (positive = moved up)
    for i, d in enumerate(depts):
        new_rank = i + 1
        prev = d.get("prev_rank", new_rank)
        d["rank"] = new_rank
        d["rank_delta"] = prev - new_rank  # positive = climbed
    return depts


@api.get("/dashboard/predictions")
async def dashboard_predictions(user: dict = Depends(current_user)):
    """Linear regression on 6 months of department ESG history — projects next 3 months.
    Highlights departments at risk of missing goals."""
    history = await db.department_history.find({}, {"_id": 0}).to_list(1000)
    depts = await db.departments.find({}, {"_id": 0}).to_list(100)
    goal_score = 80.0  # target ESG score threshold

    grouped = defaultdict(list)
    for h in history:
        grouped[h["department"]].append((h["month_index"], h["esg_score"]))

    predictions = []
    for dept in depts:
        pts = sorted(grouped.get(dept["name"], []))
        if len(pts) < 2:
            continue
        xs = [p[0] for p in pts]
        ys = [p[1] for p in pts]
        n = len(xs)
        sum_x, sum_y = sum(xs), sum(ys)
        sum_xy = sum(x * y for x, y in zip(xs, ys))
        sum_x2 = sum(x * x for x in xs)
        denom = n * sum_x2 - sum_x * sum_x
        slope = (n * sum_xy - sum_x * sum_y) / denom if denom else 0
        intercept = (sum_y - slope * sum_x) / n
        # project 3 months into the future (x = 6, 7, 8)
        projected = [round(intercept + slope * (n + k), 1) for k in range(3)]
        current = ys[-1]
        month3 = projected[-1]
        gap = round(month3 - goal_score, 1)
        # narrative
        if slope >= 0.5:
            narrative = f"{dept['name']} is on a strong upward trajectory (+{slope:.2f}/month)."
            status = "on_track"
        elif slope > 0:
            narrative = f"{dept['name']} is improving slowly (+{slope:.2f}/month), but may miss the {goal_score} target."
            status = "slow"
        elif slope > -0.3:
            narrative = f"{dept['name']} has plateaued. At current pace, projected score in 3 months is {month3}."
            status = "flat"
        else:
            gap_pct = abs(round((gap / goal_score) * 100, 1))
            narrative = f"⚠ At current pace, {dept['name']} will miss the {goal_score} ESG goal by {gap_pct}% in 3 months."
            status = "at_risk"
        predictions.append({
            "department": dept["name"],
            "color": dept.get("color", "#166534"),
            "current": current,
            "projected_3m": projected,
            "slope": round(slope, 3),
            "status": status,
            "narrative": narrative,
            "goal_gap": gap,
        })
    return sorted(predictions, key=lambda p: p["slope"])  # worst first


@api.get("/dashboard/smart-nudges")
async def dashboard_smart_nudges(user: dict = Depends(current_user)):
    """Personalised, time-aware nudges for the current user."""
    nudges = []

    # 1) XP-to-next-badge
    badges = await db.badges.find({}, {"_id": 0}).sort("xp_value", 1).to_list(100)
    owned = set(user.get("badges", []))
    next_badge = next(
        (b for b in badges if b["name"].lower().replace(" ", "_") not in owned),
        None,
    )
    if next_badge:
        # heuristic: xp needed = xp_value - (user_xp % xp_value)
        xp_needed = max(10, next_badge["xp_value"] - (user["xp"] % max(next_badge["xp_value"], 1)))
        nudges.append({
            "type": "badge",
            "icon": "award",
            "title": f"You're {xp_needed} XP from '{next_badge['name']}'",
            "message": next_badge["description"],
            "action": "Join a challenge to earn XP",
            "priority": "high",
        })

    # 2) Pending policy acknowledgements
    async for p in db.policies.find({"status": "active"}, {"_id": 0}):
        if user["id"] not in p.get("acknowledgements", []):
            nudges.append({
                "type": "policy",
                "icon": "shield",
                "title": f"Acknowledge: {p['title']}",
                "message": f"v{p['version']} — takes 30 seconds",
                "action": "Read & acknowledge",
                "priority": "medium",
            })
            break  # only surface one at a time

    # 3) Active challenges the user hasn't joined
    async for c in db.challenges.find({"status": "active"}, {"_id": 0}):
        if user["id"] not in c.get("participants", []):
            nudges.append({
                "type": "challenge",
                "icon": "trophy",
                "title": f"New challenge: {c['title']}",
                "message": f"+{c['xp_reward']} XP · +{c['eco_coin_reward']} EcoCoins",
                "action": "Join challenge",
                "priority": "medium",
            })
            break

    # 4) Streak encouragement
    if user.get("streak", 0) >= 3:
        nudges.append({
            "type": "streak",
            "icon": "flame",
            "title": f"🔥 {user['streak']}-day streak — don't break it!",
            "message": "Log any activity today to keep it going.",
            "action": "Open Environmental",
            "priority": "low",
        })

    # 5) Reward affordability
    rewards = await db.rewards.find({}, {"_id": 0}).sort("cost", 1).to_list(10)
    affordable = [r for r in rewards if r["cost"] <= user.get("eco_coins", 0) and r["stock"] > 0]
    if affordable:
        r0 = affordable[0]
        nudges.append({
            "type": "reward",
            "icon": "coins",
            "title": f"You can redeem: {r0['name']}",
            "message": f"Costs {r0['cost']} EcoCoins — you have {user['eco_coins']}",
            "action": "Redeem now",
            "priority": "low",
        })

    return nudges[:6]


@api.post("/dashboard/simulate-score")
async def simulate_esg_score(body: dict, user: dict = Depends(current_user)):
    """What-if weight simulator: recompute overall ESG score with custom E/S/G weights."""
    w_e = float(body.get("weight_e", 33.33))
    w_s = float(body.get("weight_s", 33.33))
    w_g = float(body.get("weight_g", 33.34))
    total = w_e + w_s + w_g
    if total <= 0:
        raise HTTPException(status_code=400, detail="Weights must sum to > 0")
    # normalise
    w_e, w_s, w_g = w_e / total, w_s / total, w_g / total

    depts = await db.departments.find({}, {"_id": 0}).to_list(100)
    e_avg = sum(d["e_score"] for d in depts) / max(len(depts), 1)
    s_avg = sum(d["s_score"] for d in depts) / max(len(depts), 1)
    g_avg = sum(d["g_score"] for d in depts) / max(len(depts), 1)

    weighted_overall = round(e_avg * w_e + s_avg * w_s + g_avg * w_g, 1)

    # also recompute each department under new weights
    dept_scores = []
    for d in depts:
        s = round(d["e_score"] * w_e + d["s_score"] * w_s + d["g_score"] * w_g, 1)
        dept_scores.append({"name": d["name"], "score": s, "color": d.get("color", "#166534")})
    dept_scores.sort(key=lambda x: -x["score"])

    return {
        "overall_esg_score": weighted_overall,
        "weights_applied": {"E": round(w_e * 100, 1), "S": round(w_s * 100, 1), "G": round(w_g * 100, 1)},
        "departments": dept_scores,
    }


@api.get("/dashboard/equivalences")
async def dashboard_equivalences(user: dict = Depends(current_user)):
    """Convert total CO2 into relatable real-world equivalents."""
    total_co2 = 0.0
    async for t in db.carbon_transactions.find({}, {"_id": 0, "co2e_kg": 1}):
        total_co2 += t["co2e_kg"]
    return {
        "total_co2e_kg": round(total_co2, 2),
        "equivalents": [
            {"label": "Trees needed to offset (1 year)", "value": round(total_co2 / 21, 0), "unit": "trees", "icon": "tree-pine"},
            {"label": "Km not driven by petrol car", "value": round(total_co2 / 0.192, 0), "unit": "km", "icon": "car"},
            {"label": "Flights (Delhi→Mumbai) avoided", "value": round(total_co2 / 130, 0), "unit": "flights", "icon": "plane"},
            {"label": "Homes powered for 1 month", "value": round(total_co2 / 500, 1), "unit": "homes", "icon": "home"},
            {"label": "Smartphones charged", "value": round(total_co2 / 0.0084, 0), "unit": "phones", "icon": "smartphone"},
            {"label": "Beef burgers-worth of CO₂", "value": round(total_co2 / 3.0, 0), "unit": "burgers", "icon": "beef"},
        ],
    }


@api.get("/dashboard/activities")
async def dashboard_activities(user: dict = Depends(current_user)):
    return await db.activities.find({}, {"_id": 0}).sort("created_at", -1).to_list(20)


@api.get("/dashboard/notifications")
async def dashboard_notifications(user: dict = Depends(current_user)):
    return await db.notifications.find({}, {"_id": 0}).sort("created_at", -1).to_list(20)


@api.post("/dashboard/notifications/{id}/read")
async def mark_notification_read(id: str, user: dict = Depends(current_user)):
    await db.notifications.update_one({"id": id}, {"$set": {"read": True}})
    return {"ok": True}



@api.get("/dashboard/carbon-trend")
async def carbon_trend(user: dict = Depends(current_user)):
    """Monthly aggregated CO2 for last 6 months."""
    trend = defaultdict(float)
    async for t in db.carbon_transactions.find({}, {"_id": 0}):
        try:
            d = datetime.fromisoformat(t["date"].replace("Z", "+00:00"))
            key = d.strftime("%b %Y")
            trend[key] += t["co2e_kg"]
        except Exception:
            continue
    # Return chronologically sorted last 6
    items = sorted(trend.items(), key=lambda kv: datetime.strptime(kv[0], "%b %Y"))
    return [{"month": k, "co2e_kg": round(v, 2)} for k, v in items[-6:]]


# ---------- ENVIRONMENTAL ----------
@api.get("/environmental/factors")
async def get_factors(user: dict = Depends(current_user)):
    return await db.emission_factors.find({}, {"_id": 0}).to_list(200)


@api.get("/environmental/transactions")
async def get_transactions(user: dict = Depends(current_user)):
    return await db.carbon_transactions.find({}, {"_id": 0}).sort("date", -1).to_list(200)


@api.post("/environmental/transactions")
async def add_transaction(tx: CarbonTransaction, user: dict = Depends(current_user)):
    factor = await db.emission_factors.find_one({"id": tx.factor_id}, {"_id": 0})
    if factor:
        tx.co2e_kg = round(tx.quantity * factor["factor"], 2)
        tx.scope = factor["scope"]
    tx.id = new_id()  # always regenerate server-side
    doc = tx.model_dump()
    await db.carbon_transactions.insert_one(doc)
    await db.activities.insert_one({
        "id": new_id(), "user_id": user["id"], "user_name": user["name"],
        "action": f"logged {tx.quantity} {tx.unit} of {tx.category}",
        "module": "environmental", "metadata": {"co2e": tx.co2e_kg},
        "created_at": now_iso(),
    })
    return strip_id(doc)


@api.get("/environmental/goals")
async def get_goals(user: dict = Depends(current_user)):
    return await db.sustainability_goals.find({}, {"_id": 0}).to_list(100)


@api.get("/environmental/scope-breakdown")
async def scope_breakdown(user: dict = Depends(current_user)):
    scopes = defaultdict(float)
    async for t in db.carbon_transactions.find({}, {"_id": 0}):
        scopes[t.get("scope", 0)] += t["co2e_kg"]
    return [{"scope": f"Scope {k}", "value": round(v, 2)} for k, v in sorted(scopes.items())]


# ---------- SOCIAL ----------
@api.get("/social/csr")
async def get_csr(user: dict = Depends(current_user)):
    return await db.csr_activities.find({}, {"_id": 0}).sort("created_at", -1).to_list(200)


@api.post("/social/csr")
async def add_csr(a: CSRActivity, user: dict = Depends(current_user)):
    a.organizer = user["name"]
    a.id = new_id()  # always regenerate server-side
    doc = a.model_dump()
    await db.csr_activities.insert_one(doc)
    await db.activities.insert_one({
        "id": new_id(), "user_id": user["id"], "user_name": user["name"],
        "action": f"created new CSR activity: {a.title}", "module": "social",
        "metadata": {}, "created_at": now_iso(),
    })
    return strip_id(doc)


@api.patch("/social/csr/{csr_id}/status")
async def update_csr_status(csr_id: str, body: dict, user: dict = Depends(current_user)):
    if user["role"] not in ["admin", "manager"]:
        raise HTTPException(status_code=403, detail="Only managers can approve")
    new_status = body.get("status")
    if new_status not in ["approved", "rejected", "pending"]:
        raise HTTPException(status_code=400, detail="Invalid status")
    await db.csr_activities.update_one({"id": csr_id}, {"$set": {"status": new_status}})
    return {"ok": True}


@api.get("/social/diversity")
async def get_diversity(user: dict = Depends(current_user)):
    return await db.diversity_metrics.find({}, {"_id": 0}).to_list(100)


# ---------- GOVERNANCE ----------
@api.get("/governance/policies")
async def get_policies(user: dict = Depends(current_user)):
    return await db.policies.find({}, {"_id": 0}).to_list(100)


@api.post("/governance/policies/{policy_id}/acknowledge")
async def ack_policy(policy_id: str, user: dict = Depends(current_user)):
    await db.policies.update_one(
        {"id": policy_id}, {"$addToSet": {"acknowledgements": user["id"]}}
    )
    return {"ok": True}


@api.get("/governance/audits")
async def get_audits(user: dict = Depends(current_user)):
    return await db.audits.find({}, {"_id": 0}).sort("scheduled_date", -1).to_list(100)


@api.get("/governance/issues")
async def get_issues(user: dict = Depends(current_user)):
    return await db.compliance_issues.find({}, {"_id": 0}).sort("due_date", 1).to_list(100)


# ---------- GAMIFICATION ----------
@api.get("/gamification/challenges")
async def get_challenges(user: dict = Depends(current_user)):
    return await db.challenges.find({}, {"_id": 0}).to_list(100)


@api.post("/gamification/challenges/{cid}/join")
async def join_challenge(cid: str, user: dict = Depends(current_user)):
    ch = await db.challenges.find_one({"id": cid}, {"_id": 0})
    if not ch:
        raise HTTPException(status_code=404, detail="Challenge not found")
    await db.challenges.update_one({"id": cid}, {"$addToSet": {"participants": user["id"]}})
    # award xp
    await db.users.update_one(
        {"id": user["id"]},
        {"$inc": {"xp": ch["xp_reward"], "eco_coins": ch["eco_coin_reward"]}}
    )
    await db.activities.insert_one({
        "id": new_id(), "user_id": user["id"], "user_name": user["name"],
        "action": f"joined challenge '{ch['title']}' (+{ch['xp_reward']} XP)",
        "module": "gamification", "metadata": {},
        "created_at": now_iso(),
    })
    return {"ok": True, "xp_awarded": ch["xp_reward"], "coins_awarded": ch["eco_coin_reward"]}


@api.get("/gamification/badges")
async def get_badges(user: dict = Depends(current_user)):
    return await db.badges.find({}, {"_id": 0}).to_list(100)


@api.get("/gamification/rewards")
async def get_rewards(user: dict = Depends(current_user)):
    return await db.rewards.find({}, {"_id": 0}).to_list(100)


@api.post("/gamification/rewards/{rid}/redeem")
async def redeem_reward(rid: str, user: dict = Depends(current_user)):
    reward = await db.rewards.find_one({"id": rid}, {"_id": 0})
    if not reward:
        raise HTTPException(status_code=404, detail="Reward not found")
    if user["eco_coins"] < reward["cost"]:
        raise HTTPException(status_code=400, detail="Insufficient EcoCoins")
    if reward["stock"] <= 0:
        raise HTTPException(status_code=400, detail="Out of stock")
    await db.users.update_one({"id": user["id"]}, {"$inc": {"eco_coins": -reward["cost"]}})
    await db.rewards.update_one({"id": rid}, {"$inc": {"stock": -1}})
    redemption = {
        "id": new_id(), "user_id": user["id"], "reward_id": rid,
        "reward_name": reward["name"], "cost": reward["cost"],
        "status": "pending", "redeemed_at": now_iso(),
    }
    await db.redemptions.insert_one(redemption)
    strip_id(redemption)
    return {"ok": True, "redemption": redemption}


@api.get("/gamification/leaderboard")
async def leaderboard(user: dict = Depends(current_user)):
    return await db.users.find(
        {}, {"_id": 0, "password_hash": 0}
    ).sort("xp", -1).limit(10).to_list(10)


# ---------- REPORTS ----------
@api.get("/reports/summary")
async def report_summary(user: dict = Depends(current_user)):
    overview = await dashboard_overview(user)
    depts = await db.departments.find({}, {"_id": 0}).to_list(100)
    top_dept = max(depts, key=lambda d: d["esg_score"]) if depts else None
    return {"overview": overview, "top_department": top_dept, "generated_at": now_iso()}


# ---------- AI ----------
@api.post("/ai/advisor")
async def ai_advisor(req: AIChatRequest, user: dict = Depends(current_user)):
    session_id = req.session_id or f"advisor-{user['id']}"
    try:
        reply = await ai_service.advisor_reply(session_id, req.message)
        await db.ai_messages.insert_one({
            "id": new_id(), "user_id": user["id"], "session_id": session_id,
            "message": req.message, "reply": reply, "created_at": now_iso(),
        })
        return {"reply": reply, "session_id": session_id}
    except Exception as e:
        logger.exception("AI advisor error")
        raise HTTPException(status_code=500, detail=f"AI error: {str(e)}")


@api.post("/ai/report")
async def ai_report(req: AIReportRequest, user: dict = Depends(current_user)):
    overview = await dashboard_overview(user)
    depts = await db.departments.find({}, {"_id": 0}).to_list(100)
    try:
        report = await ai_service.generate_report(
            req.report_type, req.period,
            {"overview": overview, "departments": depts}
        )
        return report
    except Exception as e:
        logger.exception("AI report error")
        raise HTTPException(status_code=500, detail=f"AI error: {str(e)}")


@api.post("/ai/compliance-check")
async def ai_compliance(req: AICompliancePayload, user: dict = Depends(current_user)):
    try:
        return await ai_service.compliance_check(req.context)
    except Exception as e:
        logger.exception("AI compliance error")
        raise HTTPException(status_code=500, detail=f"AI error: {str(e)}")


@api.post("/ai/carbon-forecast")
async def ai_forecast(user: dict = Depends(current_user)):
    trend = await carbon_trend(user)
    try:
        return await ai_service.carbon_forecast(trend)
    except Exception as e:
        logger.exception("AI forecast error")
        raise HTTPException(status_code=500, detail=f"AI error: {str(e)}")


# ---------- SCORING & COMPLIANCE HELPERS ----------
async def compute_and_save_department_scores(db):
    config_doc = await db.esg_config.find_one({})
    if not config_doc:
        config_doc = {
            "weight_e": 40.0,
            "weight_s": 30.0,
            "weight_g": 30.0,
            "auto_emission_calc": True,
            "evidence_required": True,
            "badge_auto_award": True
        }
        await db.esg_config.insert_one(config_doc)
    
    w_e = float(config_doc.get("weight_e", 40.0)) / 100.0
    w_s = float(config_doc.get("weight_s", 30.0)) / 100.0
    w_g = float(config_doc.get("weight_g", 30.0)) / 100.0
    
    depts = await db.departments.find({}).to_list(100)
    policies_count = await db.policies.count_documents({"status": "active"})
    
    for d in depts:
        dept_name = d["name"]
        emp_count = max(d.get("employee_count", 1), 1)
        
        # --- E_score ---
        total_co2 = 0.0
        async for t in db.carbon_transactions.find({"department": dept_name}):
            total_co2 += t["co2e_kg"]
        
        carbon_score = 50.0 * (1.0 - min(1.0, total_co2 / (emp_count * 500.0)))
        
        goals = await db.sustainability_goals.find({"department": dept_name}).to_list(100)
        if not goals:
            goals = await db.sustainability_goals.find({"department": None}).to_list(100)
        
        goal_score = 50.0
        if goals:
            total_progress = 0.0
            for g in goals:
                if g["target_value"] > 0:
                    total_progress += min(1.0, g["current_value"] / g["target_value"])
                else:
                    total_progress += 1.0
            goal_score = 50.0 * (total_progress / len(goals))
            
        e_score = round(carbon_score + goal_score, 1)
        
        # --- S_score ---
        div = await db.diversity_metrics.find_one({"department": dept_name})
        if not div:
            div = {
                "total_employees": emp_count,
                "female_count": int(emp_count * 0.4),
                "male_count": int(emp_count * 0.6),
                "minority_percent": 15.0,
                "training_completion": 80.0
            }
        
        fem_ratio = div["female_count"] / max(div["total_employees"], 1)
        diversity_score = 30.0 * (1.0 - abs(fem_ratio - 0.5) * 2)
        training_score = 40.0 * (div["training_completion"] / 100.0)
        
        csr_hours = 0.0
        async for a in db.csr_activities.find({"department": dept_name, "status": "approved"}):
            csr_hours += a["hours"]
        csr_score = 30.0 * min(1.0, csr_hours / (emp_count * 5.0))
        
        s_score = round(diversity_score + training_score + csr_score, 1)
        
        # --- G_score ---
        ack_score = 50.0
        if policies_count > 0:
            users_in_dept = await db.users.find({"department": dept_name}).to_list(200)
            user_ids = [u["id"] for u in users_in_dept]
            if user_ids:
                ack_count = 0
                async for p in db.policies.find({"status": "active"}):
                    for uid in p.get("acknowledgements", []):
                        if uid in user_ids:
                            ack_count += 1
                ack_score = 50.0 * (ack_count / (policies_count * len(user_ids)))
        
        audits = await db.audits.find({"department": dept_name, "status": "completed"}).to_list(100)
        avg_audit_score = 100.0
        if audits:
            avg_audit_score = sum(a.get("score", 100.0) or 100.0 for a in audits) / len(audits)
        
        open_issues = await db.compliance_issues.count_documents({"department": dept_name, "status": {"$ne": "resolved"}})
        
        g_score_base = 50.0 * (avg_audit_score / 100.0) - (open_issues * 5.0)
        g_score = round(max(0.0, min(50.0, g_score_base)) + ack_score, 1)
        
        # --- Rollup ---
        esg_score = round(e_score * w_e + s_score * w_s + g_score * w_g, 1)
        
        await db.departments.update_one(
            {"id": d["id"]},
            {"$set": {
                "e_score": e_score,
                "s_score": s_score,
                "g_score": g_score,
                "esg_score": esg_score
            }}
        )


async def check_badge_unlocks(db, user_id: str):
    config = await db.esg_config.find_one({})
    if config and not config.get("badge_auto_award", True):
        return []
    
    user = await db.users.find_one({"id": user_id})
    if not user:
        return []
    
    badges = await db.badges.find({}).to_list(100)
    owned = set(user.get("badges", []))
    unlocked = []
    
    completed_challenges_count = await db.challenge_participations.count_documents({
        "employee_id": user_id,
        "approval": "approved",
        "progress": 100
    })
    
    csr_hours = 0.0
    async for p in db.employee_participations.find({"employee_id": user_id, "approval_status": "approved"}):
        csr_act = await db.csr_activities.find_one({"id": p["activity_id"]})
        if csr_act:
            csr_hours += csr_act.get("hours", 0)
            
    active_policies_count = await db.policies.count_documents({"status": "active"})
    acknowledged_count = await db.policies.count_documents({"status": "active", "acknowledgements": user_id})
    all_policies_ack = active_policies_count > 0 and acknowledged_count == active_policies_count
    
    for b in badges:
        badge_key = b["name"].lower().replace(" ", "_")
        if badge_key in owned:
            continue
        
        should_unlock = False
        req = b.get("requirement", "").lower()
        if "first challenge" in req and completed_challenges_count >= 1:
            should_unlock = True
        elif "5 env challenges" in req and completed_challenges_count >= 5:
            should_unlock = True
        elif "25 csr hours" in req and csr_hours >= 25.0:
            should_unlock = True
        elif "all policies" in req and all_policies_ack:
            should_unlock = True
        elif "30% reduction" in req and user.get("xp", 0) >= 1500:
            should_unlock = True
        elif "top-3" in req and user.get("level", 1) >= 5:
            should_unlock = True
            
        if should_unlock:
            await db.users.update_one(
                {"id": user_id},
                {"$addToSet": {"badges": badge_key}, "$inc": {"xp": b.get("xp_value", 50)}}
            )
            await db.notifications.insert_one({
                "id": new_id(),
                "user_id": user_id,
                "title": f"🏆 Badge Unlocked: {b['name']}",
                "message": f"You unlocked '{b['name']}'! (+{b.get('xp_value', 50)} XP)",
                "type": "success",
                "read": False,
                "created_at": now_iso()
            })
            unlocked.append(b["name"])
            
    return unlocked


async def flag_overdue_compliance_issues(db):
    now = datetime.now(timezone.utc).isoformat()
    async for issue in db.compliance_issues.find({"status": {"$in": ["open", "in_progress"]}}):
        due = issue.get("due_date", "")
        try:
            if due and due < now:
                if not issue.get("overdue", False):
                    await db.compliance_issues.update_one({"id": issue["id"]}, {"$set": {"overdue": True}})
                    owner_user = await db.users.find_one({"name": issue["owner"]})
                    user_id = owner_user["id"] if owner_user else None
                    await db.notifications.insert_one({
                        "id": new_id(),
                        "user_id": user_id,
                        "title": f"⚠️ Overdue Compliance Issue: {issue['title']}",
                        "message": f"Compliance issue '{issue['title']}' is overdue.",
                        "type": "error",
                        "read": False,
                        "created_at": now_iso()
                    })
        except Exception:
            continue


# ---------- SETTINGS CONFIGURATION ----------
@api.get("/settings/config")
async def get_esg_config(user: dict = Depends(current_user)):
    cfg = await db.esg_config.find_one({})
    if not cfg:
        cfg = {"weight_e": 40.0, "weight_s": 30.0, "weight_g": 30.0, "auto_emission_calc": True, "evidence_required": True, "badge_auto_award": True}
    return strip_id(cfg)


@api.put("/settings/config")
async def update_esg_config(cfg: ESGConfig, user: dict = Depends(current_user)):
    if user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Only admins can manage configuration")
    await db.esg_config.update_one({}, {"$set": cfg.model_dump()}, upsert=True)
    await compute_and_save_department_scores(db)
    return {"ok": True}


@api.get("/settings/departments")
async def get_settings_departments(user: dict = Depends(current_user)):
    return await db.departments.find({}, {"_id": 0}).to_list(100)


@api.post("/settings/departments")
async def create_department(dept: Department, user: dict = Depends(current_user)):
    if user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Admin only")
    dept.id = new_id()
    doc = dept.model_dump()
    await db.departments.insert_one(doc)
    await compute_and_save_department_scores(db)
    return strip_id(doc)


@api.put("/settings/departments/{id}")
async def update_department(id: str, dept: Department, user: dict = Depends(current_user)):
    if user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Admin only")
    await db.departments.update_one({"id": id}, {"$set": {
        "name": dept.name,
        "code": dept.code,
        "head": dept.head,
        "parent_department": dept.parent_department,
        "employee_count": dept.employee_count,
        "color": dept.color,
        "status": dept.status
    }})
    await compute_and_save_department_scores(db)
    return {"ok": True}


@api.delete("/settings/departments/{id}")
async def delete_department(id: str, user: dict = Depends(current_user)):
    if user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Admin only")
    await db.departments.delete_one({"id": id})
    await compute_and_save_department_scores(db)
    return {"ok": True}


@api.get("/settings/categories")
async def get_settings_categories(user: dict = Depends(current_user)):
    return await db.categories.find({}, {"_id": 0}).to_list(200)


@api.post("/settings/categories")
async def create_category(cat: Category, user: dict = Depends(current_user)):
    if user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Admin only")
    cat.id = new_id()
    doc = cat.model_dump()
    await db.categories.insert_one(doc)
    return strip_id(doc)


@api.put("/settings/categories/{id}")
async def update_category(id: str, cat: Category, user: dict = Depends(current_user)):
    if user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Admin only")
    await db.categories.update_one({"id": id}, {"$set": {"name": cat.name, "type": cat.type, "status": cat.status}})
    return {"ok": True}


@api.delete("/settings/categories/{id}")
async def delete_category(id: str, user: dict = Depends(current_user)):
    if user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Admin only")
    await db.categories.delete_one({"id": id})
    return {"ok": True}


@api.get("/settings/notifications")
async def get_settings_notifications(user: dict = Depends(current_user)):
    n = await db.notification_settings.find_one({"user_id": user["id"]})
    if not n:
        n = {"new_compliance_issue": True, "approval_decisions": True, "policy_reminders": True, "badge_unlocks": True}
    return strip_id(n)


@api.put("/settings/notifications")
async def update_settings_notifications(cfg: NotificationSettings, user: dict = Depends(current_user)):
    await db.notification_settings.update_one({"user_id": user["id"]}, {"$set": cfg.model_dump()}, upsert=True)
    return {"ok": True}


# ---------- SOCIAL & PARTICIPATION ENDPOINTS ----------
@api.get("/social/participations")
async def get_social_participations(user: dict = Depends(current_user)):
    return await db.employee_participations.find({}, {"_id": 0}).to_list(500)


@api.post("/social/participations")
async def add_social_participation(p: EmployeeParticipation, user: dict = Depends(current_user)):
    config = await db.esg_config.find_one({})
    if config and config.get("evidence_required", True) and not p.proof:
        raise HTTPException(status_code=400, detail="Evidence proof is required for CSR participation.")
    p.id = new_id()
    p.employee_id = user["id"]
    p.employee_name = user["name"]
    doc = p.model_dump()
    await db.employee_participations.insert_one(doc)
    return strip_id(doc)


@api.patch("/social/participations/{id}/status")
async def update_participation_status(id: str, body: dict, user: dict = Depends(current_user)):
    if user["role"] not in ["admin", "manager"]:
        raise HTTPException(status_code=403, detail="Only managers can approve participation")
    new_status = body.get("status")
    if new_status not in ["approved", "rejected", "pending"]:
        raise HTTPException(status_code=400, detail="Invalid status")
    
    p = await db.employee_participations.find_one({"id": id})
    if not p:
        raise HTTPException(status_code=404, detail="Participation not found")
        
    await db.employee_participations.update_one({"id": id}, {"$set": {"approval_status": new_status}})
    
    if new_status == "approved":
        csr_act = await db.csr_activities.find_one({"id": p["activity_id"]})
        pts = csr_act.get("xp_reward", 100) if csr_act else 100
        await db.employee_participations.update_one({"id": id}, {"$set": {"points_earned": pts}})
        # Award to employee user
        await db.users.update_one({"id": p["employee_id"]}, {"$inc": {"xp": pts, "eco_coins": pts}})
        # Create notification
        await db.notifications.insert_one({
            "id": new_id(),
            "user_id": p["employee_id"],
            "title": "🎉 CSR Participation Approved!",
            "message": f"Your participation in '{p['activity_title']}' was approved! (+{pts} XP / EcoCoins)",
            "type": "success",
            "read": False,
            "created_at": now_iso()
        })
        await check_badge_unlocks(db, p["employee_id"])
        await compute_and_save_department_scores(db)
        
    return {"ok": True}


# ---------- CHALLENGES LIFECYCLE & PARTICIPATIONS ----------
@api.post("/gamification/challenges")
async def create_challenge(ch: Challenge, user: dict = Depends(current_user)):
    if user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Admin only")
    ch.id = new_id()
    doc = ch.model_dump()
    await db.challenges.insert_one(doc)
    return strip_id(doc)


@api.patch("/gamification/challenges/{id}/status")
async def update_challenge_status(id: str, body: dict, user: dict = Depends(current_user)):
    if user["role"] not in ["admin", "manager"]:
        raise HTTPException(status_code=403, detail="Only managers/admins can update challenge lifecycle")
    new_status = body.get("status")
    if new_status not in ["draft", "active", "under_review", "completed", "archived"]:
        raise HTTPException(status_code=400, detail="Invalid lifecycle status")
    await db.challenges.update_one({"id": id}, {"$set": {"status": new_status}})
    return {"ok": True}


@api.get("/gamification/participations")
async def get_challenge_participations(user: dict = Depends(current_user)):
    return await db.challenge_participations.find({}, {"_id": 0}).to_list(500)


@api.post("/gamification/participations")
async def submit_challenge_participation(p: ChallengeParticipation, user: dict = Depends(current_user)):
    # Check if already exists
    exist = await db.challenge_participations.find_one({"challenge_id": p.challenge_id, "employee_id": user["id"]})
    if exist:
        await db.challenge_participations.update_one({"challenge_id": p.challenge_id, "employee_id": user["id"]}, {"$set": {
            "progress": p.progress,
            "proof": p.proof,
            "approval": "pending"
        }})
        return {"ok": True, "message": "Participation updated"}
        
    p.id = new_id()
    p.employee_id = user["id"]
    p.employee_name = user["name"]
    p.approval = "pending"
    doc = p.model_dump()
    await db.challenge_participations.insert_one(doc)
    # Also add user to participants in challenge
    await db.challenges.update_one({"id": p.challenge_id}, {"$addToSet": {"participants": user["id"]}})
    return strip_id(doc)


@api.patch("/gamification/participations/{id}/approve")
async def approve_challenge_participation(id: str, body: dict, user: dict = Depends(current_user)):
    if user["role"] not in ["admin", "manager"]:
        raise HTTPException(status_code=403, detail="Manager/Admin only")
    new_status = body.get("status")
    if new_status not in ["approved", "rejected"]:
        raise HTTPException(status_code=400, detail="Invalid approval status")
        
    p = await db.challenge_participations.find_one({"id": id})
    if not p:
        raise HTTPException(status_code=404, detail="Participation not found")
        
    await db.challenge_participations.update_one({"id": id}, {"$set": {"approval": new_status}})
    
    if new_status == "approved":
        ch = await db.challenges.find_one({"id": p["challenge_id"]})
        xp = ch.get("xp_reward", 100) if ch else 100
        coins = ch.get("eco_coin_reward", 50) if ch else 50
        await db.challenge_participations.update_one({"id": id}, {"$set": {"xp_awarded": xp}})
        # Award to employee user
        await db.users.update_one({"id": p["employee_id"]}, {"$inc": {"xp": xp, "eco_coins": coins}})
        # Notify
        await db.notifications.insert_one({
            "id": new_id(),
            "user_id": p["employee_id"],
            "title": "🏆 Challenge Approved!",
            "message": f"Your challenge completion for '{p['challenge_title']}' was approved! (+{xp} XP / +{coins} EcoCoins)",
            "type": "success",
            "read": False,
            "created_at": now_iso()
        })
        await check_badge_unlocks(db, p["employee_id"])
        await compute_and_save_department_scores(db)
        
    return {"ok": True}


# ---------- CUSTOM REPORT BUILDER ----------
@api.get("/reports/custom")
async def custom_report(
    department: Optional[str] = None,
    date_start: Optional[str] = None,
    date_end: Optional[str] = None,
    module: Optional[str] = None,
    employee: Optional[str] = None,
    challenge: Optional[str] = None,
    category: Optional[str] = None,
    user: dict = Depends(current_user)
):
    # Retrieve all matched transactions, CSRs, Audits, and Challenges
    data = {"transactions": [], "csr": [], "audits": [], "challenges": []}
    
    # 1. Carbon Transactions
    tx_query = {}
    if department:
        tx_query["department"] = department
    if date_start:
        tx_query["date"] = {"$gte": date_start}
    if date_end:
        tx_query.setdefault("date", {})["$lte"] = date_end
    if category:
        tx_query["category"] = category
        
    if not module or module == "environmental":
        data["transactions"] = await db.carbon_transactions.find(tx_query, {"_id": 0}).to_list(1000)
        
    # 2. CSR Activities
    csr_query = {}
    if department:
        csr_query["department"] = department
    if date_start:
        csr_query["date"] = {"$gte": date_start}
    if date_end:
        csr_query.setdefault("date", {})["$lte"] = date_end
    if category:
        csr_query["category"] = category
        
    if not module or module == "social":
        data["csr"] = await db.csr_activities.find(csr_query, {"_id": 0}).to_list(1000)
        
    # 3. Audits
    audit_query = {}
    if department:
        audit_query["department"] = department
    if date_start:
        audit_query["scheduled_date"] = {"$gte": date_start}
    if date_end:
        audit_query.setdefault("scheduled_date", {})["$lte"] = date_end
        
    if not module or module == "governance":
        data["audits"] = await db.audits.find(audit_query, {"_id": 0}).to_list(1000)
        
    # 4. Challenges
    ch_query = {}
    if category:
        ch_query["category"] = category
        
    if not module or module == "gamification":
        data["challenges"] = await db.challenges.find(ch_query, {"_id": 0}).to_list(1000)
        
    return data


# ---------- SEARCH ----------
@api.get("/search")
async def search(q: str, user: dict = Depends(current_user)):
    q_lower = q.lower()
    results = []
    async for p in db.policies.find({}, {"_id": 0, "id": 1, "title": 1}):
        if q_lower in p["title"].lower():
            results.append({"type": "policy", **p})
    async for c in db.challenges.find({}, {"_id": 0, "id": 1, "title": 1}):
        if q_lower in c["title"].lower():
            results.append({"type": "challenge", **c})
    async for a in db.csr_activities.find({}, {"_id": 0, "id": 1, "title": 1}):
        if q_lower in a["title"].lower():
            results.append({"type": "csr", **a})
    return results[:20]


# ---------- health ----------
@api.get("/")
async def root():
    return {"status": "ok", "app": "EcoSphere ESG Platform"}


app.include_router(api)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get("CORS_ORIGINS", "*").split(","),
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("shutdown")
async def shutdown():
    client.close()

"""Idempotent seed data for EcoSphere ESG platform."""
import os
import secrets
from datetime import datetime, timezone, timedelta
from typing import Any, List, Tuple

from auth import hash_password
from models import new_id, now_iso


def _dt(days_ago: int) -> str:
    return (datetime.now(timezone.utc) - timedelta(days=days_ago)).isoformat()


def _rand_int(lo: int, hi_inclusive: int) -> int:
    """Cryptographically-secure integer in [lo, hi_inclusive]."""
    return lo + secrets.randbelow(hi_inclusive - lo + 1)


async def _seed_admin(db: Any) -> None:
    admin_email = os.environ["ADMIN_EMAIL"]
    admin_pw = os.environ["ADMIN_PASSWORD"]
    existing = await db.users.find_one({"email": admin_email})
    if existing:
        await db.users.update_one({"email": admin_email}, {"$set": {
            "name": "Aarav Sharma",
            "role": "admin",
            "department": "Executive",
            "avatar": "https://images.pexels.com/photos/30692588/pexels-photo-30692588.jpeg",
            "xp": 2450, "level": 8, "eco_coins": 1200, "streak": 14,
            "badges": ["eco_champion", "green_pioneer", "policy_master"]
        }})
        return
    await db.users.insert_one({
        "id": new_id(),
        "email": admin_email,
        "password_hash": hash_password(admin_pw),
        "name": "Aarav Sharma",
        "role": "admin",
        "department": "Executive",
        "avatar": "https://images.pexels.com/photos/30692588/pexels-photo-30692588.jpeg",
        "xp": 2450, "level": 8, "eco_coins": 1200, "streak": 14,
        "badges": ["eco_champion", "green_pioneer", "policy_master"],
        "created_at": now_iso(),
    })


async def _seed_demo_users(db: Any) -> None:
    users: List[Tuple] = [
        ("manager@ecosphere.com", "Manager@123", "Priya Patel", "manager", "Operations",
         "https://images.pexels.com/photos/11655430/pexels-photo-11655430.jpeg",
         1820, 6, 780, 9, ["eco_champion", "team_lead"]),
        ("employee@ecosphere.com", "Employee@123", "Rohan Verma", "employee", "Engineering",
         "https://images.pexels.com/photos/28442317/pexels-photo-28442317.jpeg",
         940, 4, 340, 5, ["first_step"]),
        ("sara@ecosphere.com", "Sara@123", "Sara Iyer", "employee", "Marketing",
         "https://images.pexels.com/photos/11655430/pexels-photo-11655430.jpeg",
         1210, 5, 450, 7, ["first_step", "csr_hero"]),
        ("dev@ecosphere.com", "Dev@123", "Dev Kapoor", "employee", "Engineering",
         "https://images.pexels.com/photos/28442317/pexels-photo-28442317.jpeg",
         680, 3, 220, 3, []),
    ]
    for email, pw, name, role, dept, avatar, xp, level, coins, streak, badges in users:
        existing = await db.users.find_one({"email": email})
        if existing:
            await db.users.update_one({"email": email}, {"$set": {
                "name": name, "role": role, "department": dept, "avatar": avatar,
                "xp": xp, "level": level, "eco_coins": coins, "streak": streak,
                "badges": badges
            }})
            continue
        await db.users.insert_one({
            "id": new_id(), "email": email, "password_hash": hash_password(pw),
            "name": name, "role": role, "department": dept, "avatar": avatar,
            "xp": xp, "level": level, "eco_coins": coins, "streak": streak,
            "badges": badges, "created_at": now_iso(),
        })


async def _seed_departments(db: Any) -> None:
    if await db.departments.count_documents({}) > 0:
        return
    depts: List[Tuple] = [
        # (name, head, employee_count, esg, e, s, g, color, prev_rank)
        ("Operations", "Priya Patel", 45, 82.5, 78, 85, 84, "#166534", 3),
        ("Engineering", "Rohan Verma", 68, 76.2, 72, 79, 78, "#059669", 4),
        ("Marketing", "Sara Iyer", 22, 71.8, 65, 80, 70, "#F59E0B", 5),
        ("Sales", "Kunal Mehta", 34, 68.5, 60, 75, 71, "#3B82F6", 6),
        ("HR", "Anita Rao", 12, 88.4, 82, 92, 91, "#8B5CF6", 1),
        ("Finance", "Vikram Singh", 18, 74.6, 70, 76, 78, "#EF4444", 2),
    ]
    docs = [
        {"id": new_id(), "name": n, "head": h, "employee_count": ec,
         "esg_score": esg, "e_score": e, "s_score": s, "g_score": g,
         "color": color, "prev_rank": prev_rank}
        for n, h, ec, esg, e, s, g, color, prev_rank in depts
    ]
    await db.departments.insert_many(docs)


async def _seed_dept_history(db: Any) -> None:
    """6 months of monthly ESG history per department for trend/prediction."""
    if await db.department_history.count_documents({}) > 0:
        return
    depts = ["Operations", "Engineering", "Marketing", "Sales", "HR", "Finance"]
    # each dept has a base score + monthly delta (some improving, some declining)
    profiles: List[Tuple[str, float, float]] = [
        ("Operations", 78.0, 0.9),   # improving
        ("Engineering", 74.0, 0.45), # slowly improving
        ("Marketing", 72.5, -0.15),  # slight decline
        ("Sales", 69.5, -0.25),      # decline
        ("HR", 84.0, 0.9),           # strong improvement
        ("Finance", 73.5, 0.22),     # slight improvement
    ]
    docs = []
    now = datetime.now(timezone.utc)
    for name, base, delta in profiles:
        for i in range(6):
            months_ago = 5 - i
            month_date = now - timedelta(days=30 * months_ago)
            score = round(base + delta * i, 1)
            docs.append({
                "id": new_id(),
                "department": name,
                "month": month_date.strftime("%b %Y"),
                "month_index": i,
                "esg_score": score,
                "date": month_date.isoformat(),
            })
    await db.department_history.insert_many(docs)


async def _seed_emission_factors(db: Any) -> None:
    if await db.emission_factors.count_documents({}) > 0:
        return
    factors: List[Tuple] = [
        ("Electricity (Grid)", "kWh", 0.475, 2, "GHG Protocol Scope 2"),
        ("Diesel Fuel", "liter", 2.68, 1, "GHG Protocol Scope 1"),
        ("Petrol Fuel", "liter", 2.31, 1, "GHG Protocol Scope 1"),
        ("Natural Gas", "cubic_meter", 2.02, 1, "GHG Protocol Scope 1"),
        ("Air Travel (short haul)", "km", 0.158, 3, "DEFRA 2024"),
        ("Air Travel (long haul)", "km", 0.195, 3, "DEFRA 2024"),
        ("Rail Travel", "km", 0.041, 3, "DEFRA 2024"),
        ("Waste to Landfill", "kg", 0.467, 3, "GHG Protocol Scope 3"),
        ("Water Usage", "cubic_meter", 0.344, 3, "DEFRA 2024"),
        ("Paper Consumption", "kg", 0.919, 3, "DEFRA 2024"),
    ]
    docs = [
        {"id": new_id(), "category": c, "unit": u, "factor": f, "scope": s, "source": src}
        for c, u, f, s, src in factors
    ]
    await db.emission_factors.insert_many(docs)


async def _seed_carbon_transactions(db: Any) -> None:
    if await db.carbon_transactions.count_documents({}) > 0:
        return
    depts_names = ["Operations", "Engineering", "Marketing", "Sales", "HR", "Finance"]
    cat_options: List[Tuple] = [
        ("Electricity (Grid)", "kWh", 0.475, 2),
        ("Diesel Fuel", "liter", 2.68, 1),
        ("Air Travel (short haul)", "km", 0.158, 3),
        ("Waste to Landfill", "kg", 0.467, 3),
    ]
    docs = []
    for _ in range(48):
        dept = secrets.choice(depts_names)
        cat, unit, factor, scope = secrets.choice(cat_options)
        qty = _rand_int(50, 1200)
        docs.append({
            "id": new_id(),
            "department": dept, "category": cat, "activity": f"Monthly {cat} usage",
            "quantity": qty, "unit": unit, "factor_id": "",
            "co2e_kg": round(qty * factor, 2), "scope": scope,
            "date": _dt(_rand_int(1, 180)),
            "logged_by": "Priya Patel", "notes": None, "created_at": now_iso(),
        })
    await db.carbon_transactions.insert_many(docs)


async def _seed_goals(db: Any) -> None:
    if await db.sustainability_goals.count_documents({}) > 0:
        return
    goals: List[Tuple] = [
        ("Reduce Scope 2 emissions by 30%", "Cut electricity-based emissions company-wide", 30, 18.5, "%", 90, None, "active"),
        ("100% renewable electricity", "Transition all offices to solar/wind PPA", 100, 42, "%", 365, None, "active"),
        ("Zero waste to landfill", "Divert all waste through recycling & composting", 100, 68, "%", 180, "Operations", "active"),
        ("Net Zero by 2030", "Achieve carbon neutrality across all scopes", 100, 12, "%", 1825, None, "active"),
        ("Reduce business travel emissions 25%", "Shift to virtual meetings and rail travel", 25, 22, "%", 60, "Sales", "at_risk"),
    ]
    docs = [
        {"id": new_id(), "title": t, "description": d, "target_value": tv, "current_value": cv,
         "unit": u, "deadline": _dt(-days), "department": dept, "status": status}
        for t, d, tv, cv, u, days, dept, status in goals
    ]
    await db.sustainability_goals.insert_many(docs)


async def _seed_csr(db: Any) -> None:
    if await db.csr_activities.count_documents({}) > 0:
        return
    acts: List[Tuple] = [
        ("Community Tree Plantation Drive", "Planted 500 saplings in city park", "environment", 8, 24, "approved", "Rohan Verma", "Operations"),
        ("Digital Literacy for Seniors", "Weekend workshop teaching seniors basic computing", "education", 6, 12, "approved", "Sara Iyer", "Marketing"),
        ("Blood Donation Camp", "Company-wide blood donation drive with Red Cross", "health", 4, 45, "approved", "Anita Rao", "HR"),
        ("Beach Cleanup Marathon", "Collected 200kg plastic waste from Juhu beach", "environment", 5, 18, "pending", "Dev Kapoor", "Engineering"),
        ("Skill Development Workshop", "Free coding bootcamp for underprivileged youth", "education", 12, 8, "approved", "Rohan Verma", "Engineering"),
        ("Meal Distribution Drive", "Distributed 1000 meals to homeless shelters", "community", 6, 32, "pending", "Priya Patel", "Operations"),
    ]
    docs = [
        {"id": new_id(), "title": t, "description": d, "category": cat,
         "date": _dt(20), "location": "Mumbai", "hours": hrs,
         "participants": [f"user_{i}" for i in range(ppl)],
         "organizer": org, "evidence_url": None,
         "status": status, "xp_reward": 100 + hrs * 10, "department": dept,
         "created_at": now_iso()}
        for t, d, cat, hrs, ppl, status, org, dept in acts
    ]
    await db.csr_activities.insert_many(docs)


async def _seed_diversity(db: Any) -> None:
    if await db.diversity_metrics.count_documents({}) > 0:
        return
    rows: List[Tuple] = [
        ("Operations", 45, 20, 24, 1, 32, 88),
        ("Engineering", 68, 22, 44, 2, 28, 76),
        ("Marketing", 22, 14, 8, 0, 45, 92),
        ("Sales", 34, 15, 18, 1, 38, 85),
        ("HR", 12, 9, 3, 0, 50, 100),
        ("Finance", 18, 10, 8, 0, 33, 82),
    ]
    docs = [
        {"id": new_id(), "department": d, "total_employees": tot,
         "female_count": f, "male_count": m, "other_count": o,
         "minority_percent": mp, "training_completion": tc, "period": "2025-Q4"}
        for d, tot, f, m, o, mp, tc in rows
    ]
    await db.diversity_metrics.insert_many(docs)


async def _seed_policies(db: Any) -> None:
    if await db.policies.count_documents({}) > 0:
        return
    pols: List[Tuple] = [
        ("Environmental Sustainability Policy", "environmental", "Guiding principles for reducing our environmental impact including energy, water, waste and biodiversity.", "2.1"),
        ("Anti-Bribery & Anti-Corruption Policy", "ethics", "Zero tolerance approach to bribery and corruption in all business dealings.", "1.4"),
        ("Diversity, Equity & Inclusion Policy", "social", "Framework for fostering an inclusive workplace across gender, race, ability and orientation.", "3.0"),
        ("Data Privacy & Protection Policy", "governance", "How we collect, process and protect personal and business data in line with regulations.", "2.2"),
        ("Human Rights Policy", "social", "Commitment to upholding human rights across operations and supply chain.", "1.1"),
        ("Whistleblower Protection Policy", "governance", "Safe channels and protections for employees reporting misconduct.", "1.3"),
    ]
    docs = [
        {"id": new_id(), "title": t, "category": c, "version": v,
         "summary": s, "body": s + "\n\n(Full policy body available in the platform.)",
         "effective_date": _dt(90), "review_date": _dt(-275),
         "acknowledgements": [], "status": "active", "created_at": now_iso()}
        for t, c, s, v in pols
    ]
    await db.policies.insert_many(docs)


async def _seed_audits(db: Any) -> None:
    if await db.audits.count_documents({}) > 0:
        return
    audits: List[Tuple] = [
        ("Q4 Environmental Audit", "internal", "Operations", 15, "Vikram Singh", "completed", 3, 87.5),
        ("Anti-Bribery Compliance Audit", "external", "Finance", -30, "KPMG", "scheduled", 0, None),
        ("Data Privacy Audit (GDPR)", "external", "Engineering", 45, "PwC", "completed", 5, 82.0),
        ("Supply Chain ESG Audit", "internal", "Operations", 8, "Anita Rao", "in_progress", 2, None),
        ("ISO 14001 Certification Audit", "external", "Operations", -60, "TÜV SÜD", "scheduled", 0, None),
    ]
    docs = [
        {"id": new_id(), "title": t, "type": ty, "department": d,
         "scheduled_date": _dt(days), "auditor": aud, "status": st,
         "findings": findings, "score": score}
        for t, ty, d, days, aud, st, findings, score in audits
    ]
    await db.audits.insert_many(docs)


async def _seed_issues(db: Any) -> None:
    if await db.compliance_issues.count_documents({}) > 0:
        return
    issues: List[Tuple] = [
        ("Missing Scope 3 emissions data from 3 suppliers", "high", "Operations", "Priya Patel", -14, "open"),
        ("Overdue policy acknowledgements (12 employees)", "medium", "HR", "Anita Rao", -7, "in_progress"),
        ("Wastewater discharge exceeds ISO 14001 threshold", "critical", "Operations", "Priya Patel", -3, "open"),
        ("Board diversity below 30% target", "medium", "Executive", "Aarav Sharma", -60, "in_progress"),
        ("Whistleblower channel documentation missing", "low", "Governance", "Vikram Singh", -45, "resolved"),
    ]
    docs = [
        {"id": new_id(), "title": t, "description": t, "severity": sev,
         "department": d, "owner": o, "due_date": _dt(days),
         "status": st, "created_at": now_iso()}
        for t, sev, d, o, days, st in issues
    ]
    await db.compliance_issues.insert_many(docs)


async def _seed_challenges(db: Any) -> None:
    if await db.challenges.count_documents({}) > 0:
        return
    ch: List[Tuple] = [
        ("Zero-Waste Week", "Bring your own container/bottle for 5 working days", "environmental", 200, 50, "leaf"),
        ("Cycle to Work Challenge", "Commute by bicycle or public transport for 10 days", "environmental", 300, 80, "bike"),
        ("CSR Champion", "Log at least 8 CSR volunteer hours this month", "social", 400, 120, "heart"),
        ("Policy Ace", "Read and acknowledge all pending ESG policies", "governance", 150, 40, "shield"),
        ("Energy Saver", "Reduce your workstation electricity usage by 20%", "environmental", 250, 60, "zap"),
    ]
    docs = [
        {"id": new_id(), "title": t, "description": d, "category": c,
         "xp_reward": xp, "eco_coin_reward": coin,
         "start_date": _dt(5), "end_date": _dt(-25),
         "status": "active", "participants": [], "icon": icon}
        for t, d, c, xp, coin, icon in ch
    ]
    await db.challenges.insert_many(docs)


async def _seed_badges(db: Any) -> None:
    if await db.badges.count_documents({}) > 0:
        return
    bd: List[Tuple] = [
        ("Eco Champion", "Complete 5 environmental challenges", "award", "environmental", "5 env challenges", 100),
        ("CSR Hero", "Log 25+ CSR volunteer hours", "heart", "social", "25 CSR hours", 150),
        ("Policy Master", "Acknowledge all active policies", "shield-check", "governance", "All policies acknowledged", 80),
        ("Green Pioneer", "Reduce personal carbon by 30%", "leaf", "environmental", "30% reduction", 200),
        ("Team Lead", "Lead a challenge team to top 3", "users", "leadership", "Top-3 team finish", 120),
        ("First Step", "Complete your first challenge", "sparkles", "milestone", "1 challenge", 25),
    ]
    docs = [
        {"id": new_id(), "name": n, "description": d, "icon": ic,
         "category": c, "requirement": req, "xp_value": xp}
        for n, d, ic, c, req, xp in bd
    ]
    await db.badges.insert_many(docs)


async def _seed_rewards(db: Any) -> None:
    if await db.rewards.count_documents({}) > 0:
        return
    rw: List[Tuple] = [
        ("Reusable Steel Bottle", "Premium branded eco-bottle", 200, 45, "merchandise"),
        ("Extra Half-Day Off", "Redeem for an extra afternoon off", 500, 100, "time-off"),
        ("Tree Planted in Your Name", "We plant a tree via One-Tree-Planted", 100, 999, "impact"),
        ("EV Charging Voucher", "₹500 EV public charging voucher", 400, 25, "voucher"),
        ("Sustainability Book Bundle", "3-book curated ESG bundle", 350, 20, "merchandise"),
        ("Donate 1000 Meals", "We donate meals to Akshaya Patra", 800, 999, "impact"),
    ]
    docs = [
        {"id": new_id(), "name": n, "description": d, "cost": c, "stock": s,
         "category": cat, "image_url": None}
        for n, d, c, s, cat in rw
    ]
    await db.rewards.insert_many(docs)


async def _seed_notifications(db: Any) -> None:
    if await db.notifications.count_documents({}) > 0:
        return
    notes: List[Tuple] = [
        ("New Challenge: Zero-Waste Week", "Earn 200 XP + 50 EcoCoins by completing this week's challenge", "info"),
        ("Q4 Environmental Audit completed", "Score: 87.5 — 3 findings to address", "success"),
        ("Compliance Alert", "Wastewater discharge exceeds ISO 14001 threshold", "warning"),
        ("You earned the 'Green Pioneer' badge", "Awarded for a 30% personal carbon reduction", "success"),
    ]
    docs = [
        {"id": new_id(), "user_id": None, "title": t, "message": m,
         "type": tp, "read": False, "created_at": now_iso()}
        for t, m, tp in notes
    ]
    await db.notifications.insert_many(docs)


async def _seed_activities(db: Any) -> None:
    if await db.activities.count_documents({}) > 0:
        return
    acts: List[Tuple] = [
        ("Priya Patel", "logged 340 kWh electricity in Operations", "environmental"),
        ("Rohan Verma", "completed the 'Cycle to Work' challenge", "gamification"),
        ("Sara Iyer", "created new CSR activity: Digital Literacy for Seniors", "social"),
        ("Anita Rao", "acknowledged Data Privacy Policy v2.2", "governance"),
        ("Dev Kapoor", "earned the 'First Step' badge", "gamification"),
        ("Vikram Singh", "completed Q4 Environmental Audit", "governance"),
    ]
    docs = [
        {"id": new_id(), "user_id": "seed", "user_name": name,
         "action": action, "module": module, "metadata": {},
         "created_at": now_iso()}
        for name, action, module in acts
    ]
    await db.activities.insert_many(docs)


async def _seed_config(db: Any) -> None:
    if await db.esg_config.count_documents({}) > 0:
        return
    await db.esg_config.insert_one({
        "weight_e": 40.0,
        "weight_s": 30.0,
        "weight_g": 30.0,
        "auto_emission_calc": True,
        "evidence_required": True,
        "badge_auto_award": True
    })


async def _seed_categories(db: Any) -> None:
    if await db.categories.count_documents({}) > 0:
        return
    cats = [
        ("community", "csr", "active"),
        ("education", "csr", "active"),
        ("health", "csr", "active"),
        ("environment", "csr", "active"),
        ("environmental", "challenge", "active"),
        ("social", "challenge", "active"),
        ("governance", "challenge", "active"),
    ]
    docs = [
        {"id": new_id(), "name": n, "type": t, "status": s}
        for n, t, s in cats
    ]
    await db.categories.insert_many(docs)


async def _seed_products(db: Any) -> None:
    if await db.product_esg_profiles.count_documents({}) > 0:
        return
    products = [
        {
            "id": new_id(), "name": "EcoPackaging Box", "sku": "PKG-001",
            "category": "packaging", "carbon_footprint_kg": 0.8,
            "recyclability_percent": 95.0, "sustainability_score": 88.0,
            "certifications": ["FSC", "ISO 14001"],
            "lifecycle_stage": "production", "department": "Operations",
            "notes": "Made from 100% recycled cardboard", "created_at": now_iso()
        },
        {
            "id": new_id(), "name": "Solar Panel Module SP-200", "sku": "ELC-042",
            "category": "electronics", "carbon_footprint_kg": 45.2,
            "recyclability_percent": 72.0, "sustainability_score": 76.0,
            "certifications": ["Energy Star", "IEC 61215"],
            "lifecycle_stage": "distribution", "department": "Engineering",
            "notes": "Monocrystalline silicon, 25-year warranty", "created_at": now_iso()
        },
        {
            "id": new_id(), "name": "Recycled A4 Paper Ream", "sku": "RAW-103",
            "category": "raw_material", "carbon_footprint_kg": 1.2,
            "recyclability_percent": 100.0, "sustainability_score": 92.0,
            "certifications": ["FSC", "Blue Angel", "EU Ecolabel"],
            "lifecycle_stage": "use", "department": "Operations",
            "notes": "500 sheets, 80gsm, 100% post-consumer waste", "created_at": now_iso()
        },
        {
            "id": new_id(), "name": "Bamboo Office Chair", "sku": "FIN-077",
            "category": "finished_good", "carbon_footprint_kg": 12.5,
            "recyclability_percent": 85.0, "sustainability_score": 81.0,
            "certifications": ["GREENGUARD"],
            "lifecycle_stage": "production", "department": "Operations",
            "notes": "Ergonomic design with sustainably sourced bamboo frame", "created_at": now_iso()
        },
    ]
    await db.product_esg_profiles.insert_many(products)


async def seed_all(db: Any) -> None:
    """Idempotent top-level seeder. Delegates to focused helpers."""
    await _seed_config(db)
    await _seed_categories(db)
    await _seed_admin(db)
    await _seed_demo_users(db)
    await _seed_departments(db)
    await _seed_dept_history(db)
    await _seed_emission_factors(db)
    await _seed_carbon_transactions(db)
    await _seed_goals(db)
    await _seed_csr(db)
    await _seed_diversity(db)
    await _seed_policies(db)
    await _seed_audits(db)
    await _seed_issues(db)
    await _seed_challenges(db)
    await _seed_badges(db)
    await _seed_rewards(db)
    await _seed_notifications(db)
    await _seed_activities(db)
    await _seed_products(db)

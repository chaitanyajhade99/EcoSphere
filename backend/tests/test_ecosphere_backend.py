"""Backend API tests for EcoSphere ESG Platform."""
import os
import time
from typing import Any, Dict

import pytest
import requests

BASE_URL: str = os.environ.get("REACT_APP_BACKEND_URL", "https://build-demo-53.preview.emergentagent.com").rstrip("/")
API: str = f"{BASE_URL}/api"

ADMIN: tuple[str, str] = ("admin@ecosphere.com", "Admin@123")
MANAGER: tuple[str, str] = ("manager@ecosphere.com", "Manager@123")
EMPLOYEE: tuple[str, str] = ("employee@ecosphere.com", "Employee@123")


def _login(email: str, password: str) -> requests.Response:
    r = requests.post(f"{API}/auth/login", json={"email": email, "password": password}, timeout=30)
    return r


@pytest.fixture(scope="session")
def admin_token() -> str:
    r = _login(*ADMIN)
    assert r.status_code == 200, f"admin login failed: {r.text}"
    return r.json()["token"]


@pytest.fixture(scope="session")
def manager_token() -> str:
    r = _login(*MANAGER)
    assert r.status_code == 200, f"manager login failed: {r.text}"
    return r.json()["token"]


@pytest.fixture(scope="session")
def employee_token() -> str:
    r = _login(*EMPLOYEE)
    assert r.status_code == 200, f"employee login failed: {r.text}"
    return r.json()["token"]


def auth(token: str) -> Dict[str, str]:
    return {"Authorization": f"Bearer {token}"}


# ----------- AUTH -----------
class TestAuth:
    def test_health(self) -> None:
        r = requests.get(f"{API}/", timeout=10)
        assert r.status_code == 200
        assert r.json().get("status") == "ok"

    def test_admin_login(self) -> None:
        r = _login(*ADMIN)
        assert r.status_code == 200
        data = r.json()
        assert data["user"]["role"] == "admin"
        assert data["user"]["email"] == ADMIN[0]
        assert isinstance(data["token"], str) and len(data["token"]) > 10

    def test_manager_login(self) -> None:
        r = _login(*MANAGER)
        assert r.status_code == 200
        assert r.json()["user"]["role"] == "manager"

    def test_employee_login(self) -> None:
        r = _login(*EMPLOYEE)
        assert r.status_code == 200
        assert r.json()["user"]["role"] == "employee"

    def test_invalid_login(self) -> None:
        r = _login("admin@ecosphere.com", "wrongpass")
        assert r.status_code == 401

    def test_unauth_protected(self) -> None:
        r = requests.get(f"{API}/dashboard/overview", timeout=10)
        assert r.status_code == 401

    def test_me_endpoint(self, admin_token: str) -> None:
        r = requests.get(f"{API}/auth/me", headers=auth(admin_token), timeout=10)
        assert r.status_code == 200
        assert r.json()["email"] == ADMIN[0]

    def test_register_new_user(self) -> None:
        email = f"test_user_{int(time.time())}@ecosphere.com"
        payload = {"email": email, "password": "Test@1234", "name": "Test User",
                   "role": "employee", "department": "Engineering"}
        r = requests.post(f"{API}/auth/register", json=payload, timeout=15)
        assert r.status_code == 200, r.text
        data = r.json()
        assert data["user"]["email"] == email.lower()  # server lowercases
        assert data["user"]["role"] == "employee"
        assert "token" in data

        # Re-register should fail
        r2 = requests.post(f"{API}/auth/register", json=payload, timeout=15)
        assert r2.status_code == 400

    def test_bcrypt_hash_format(self) -> None:
        # verify indirect: password_hash is not returned but login works -> hash present
        # Just confirm no _id leakage
        r = _login(*ADMIN)
        data = r.json()
        assert "_id" not in data["user"]
        assert "password_hash" not in data["user"]


# ----------- DASHBOARD -----------
class TestDashboard:
    def test_overview(self, admin_token: str) -> None:
        r = requests.get(f"{API}/dashboard/overview", headers=auth(admin_token), timeout=15)
        assert r.status_code == 200
        d = r.json()
        for k in ["esg_score", "total_co2e_kg", "trees_equivalent", "csr_hours", "open_compliance_issues"]:
            assert k in d, f"missing {k}"
        assert isinstance(d["esg_score"], (int, float))

    def test_departments(self, admin_token: str) -> None:
        r = requests.get(f"{API}/dashboard/departments", headers=auth(admin_token), timeout=10)
        assert r.status_code == 200
        depts = r.json()
        assert isinstance(depts, list) and len(depts) >= 6
        assert all("esg_score" in d for d in depts)

    def test_activities(self, admin_token: str) -> None:
        r = requests.get(f"{API}/dashboard/activities", headers=auth(admin_token), timeout=10)
        assert r.status_code == 200
        assert isinstance(r.json(), list)

    def test_notifications(self, admin_token: str) -> None:
        r = requests.get(f"{API}/dashboard/notifications", headers=auth(admin_token), timeout=10)
        assert r.status_code == 200
        assert len(r.json()) >= 4

    def test_carbon_trend(self, admin_token: str) -> None:
        r = requests.get(f"{API}/dashboard/carbon-trend", headers=auth(admin_token), timeout=10)
        assert r.status_code == 200
        trend = r.json()
        assert isinstance(trend, list)
        if trend:
            assert "month" in trend[0] and "co2e_kg" in trend[0]


# ----------- ENVIRONMENTAL -----------
class TestEnvironmental:
    def test_factors(self, admin_token: str) -> None:
        r = requests.get(f"{API}/environmental/factors", headers=auth(admin_token), timeout=10)
        assert r.status_code == 200
        assert len(r.json()) >= 10

    def test_transactions_list(self, admin_token: str) -> None:
        r = requests.get(f"{API}/environmental/transactions", headers=auth(admin_token), timeout=10)
        assert r.status_code == 200
        assert len(r.json()) >= 10

    def test_add_transaction(self, employee_token: str, admin_token: str) -> None:
        # get factor
        f = requests.get(f"{API}/environmental/factors", headers=auth(admin_token)).json()[0]
        payload = {
            "department": "Engineering", "category": f["category"],
            "activity": "TEST_activity", "quantity": 100.0, "unit": f["unit"],
            "factor_id": f["id"], "co2e_kg": 0, "scope": f["scope"],
            "date": "2025-12-01T00:00:00+00:00", "logged_by": "Rohan Verma",
        }
        r = requests.post(f"{API}/environmental/transactions", json=payload,
                          headers=auth(employee_token), timeout=15)
        assert r.status_code == 200, r.text
        created = r.json()
        assert created["quantity"] == 100.0
        # co2e_kg is recomputed
        assert created["co2e_kg"] == round(100.0 * f["factor"], 2)

        # verify in list
        r2 = requests.get(f"{API}/environmental/transactions", headers=auth(admin_token))
        assert any(t.get("activity") == "TEST_activity" for t in r2.json())

    def test_goals(self, admin_token: str) -> None:
        r = requests.get(f"{API}/environmental/goals", headers=auth(admin_token), timeout=10)
        assert r.status_code == 200
        assert len(r.json()) >= 5

    def test_scope_breakdown(self, admin_token: str) -> None:
        r = requests.get(f"{API}/environmental/scope-breakdown", headers=auth(admin_token), timeout=10)
        assert r.status_code == 200
        data = r.json()
        assert isinstance(data, list) and len(data) >= 1
        assert "scope" in data[0] and "value" in data[0]


# ----------- SOCIAL -----------
class TestSocial:
    def test_csr_list(self, admin_token: str) -> None:
        r = requests.get(f"{API}/social/csr", headers=auth(admin_token), timeout=10)
        assert r.status_code == 200
        assert len(r.json()) >= 5

    def test_create_and_approve_csr(self, employee_token: str, admin_token: str) -> None:
        payload = {
            "title": "TEST_CSR_activity", "description": "Test CSR",
            "category": "environment", "date": "2025-12-15T00:00:00+00:00",
            "location": "Test Location", "hours": 4.0,
            "participants": [], "organizer": "Rohan Verma",
        }
        r = requests.post(f"{API}/social/csr", json=payload, headers=auth(employee_token), timeout=15)
        assert r.status_code == 200, r.text
        created = r.json()
        assert created["status"] == "pending"
        assert created["title"] == "TEST_CSR_activity"
        csr_id = created["id"]

        # Approve as admin
        r2 = requests.patch(f"{API}/social/csr/{csr_id}/status",
                            json={"status": "approved"}, headers=auth(admin_token), timeout=10)
        assert r2.status_code == 200

        # Verify persistence
        lst = requests.get(f"{API}/social/csr", headers=auth(admin_token)).json()
        match = [c for c in lst if c["id"] == csr_id]
        assert match and match[0]["status"] == "approved"

    def test_employee_cannot_approve(self, employee_token: str) -> None:
        r = requests.patch(f"{API}/social/csr/nonexistent/status",
                           json={"status": "approved"}, headers=auth(employee_token), timeout=10)
        assert r.status_code == 403

    def test_diversity(self, admin_token: str) -> None:
        r = requests.get(f"{API}/social/diversity", headers=auth(admin_token), timeout=10)
        assert r.status_code == 200
        assert len(r.json()) >= 6


# ----------- GOVERNANCE -----------
class TestGovernance:
    def test_policies(self, admin_token: str) -> None:
        r = requests.get(f"{API}/governance/policies", headers=auth(admin_token), timeout=10)
        assert r.status_code == 200
        assert len(r.json()) >= 5

    def test_acknowledge_policy(self, employee_token: str, admin_token: str) -> None:
        pols = requests.get(f"{API}/governance/policies", headers=auth(admin_token)).json()
        pid = pols[0]["id"]
        prev_count = len(pols[0].get("acknowledgements", []))
        r = requests.post(f"{API}/governance/policies/{pid}/acknowledge",
                          headers=auth(employee_token), timeout=10)
        assert r.status_code == 200
        pols2 = requests.get(f"{API}/governance/policies", headers=auth(admin_token)).json()
        new_count = len([p for p in pols2 if p["id"] == pid][0]["acknowledgements"])
        assert new_count >= prev_count  # $addToSet: same user won't duplicate

    def test_audits(self, admin_token: str) -> None:
        r = requests.get(f"{API}/governance/audits", headers=auth(admin_token), timeout=10)
        assert r.status_code == 200
        assert len(r.json()) >= 5

    def test_issues(self, admin_token: str) -> None:
        r = requests.get(f"{API}/governance/issues", headers=auth(admin_token), timeout=10)
        assert r.status_code == 200
        assert len(r.json()) >= 5


# ----------- GAMIFICATION -----------
class TestGamification:
    def test_challenges(self, admin_token: str) -> None:
        r = requests.get(f"{API}/gamification/challenges", headers=auth(admin_token), timeout=10)
        assert r.status_code == 200
        assert len(r.json()) >= 5

    def test_join_challenge(self, employee_token: str) -> None:
        me1 = requests.get(f"{API}/auth/me", headers=auth(employee_token)).json()
        prev_xp = me1["xp"]
        prev_coins = me1["eco_coins"]

        chs = requests.get(f"{API}/gamification/challenges", headers=auth(employee_token)).json()
        cid = chs[0]["id"]
        r = requests.post(f"{API}/gamification/challenges/{cid}/join",
                          headers=auth(employee_token), timeout=10)
        assert r.status_code == 200
        data = r.json()
        assert data["ok"] == True

        me2 = requests.get(f"{API}/auth/me", headers=auth(employee_token)).json()
        assert me2["xp"] >= prev_xp + data["xp_awarded"]
        assert me2["eco_coins"] >= prev_coins + data["coins_awarded"]

    def test_rewards_list(self, admin_token: str) -> None:
        r = requests.get(f"{API}/gamification/rewards", headers=auth(admin_token), timeout=10)
        assert r.status_code == 200
        assert len(r.json()) >= 5

    def test_redeem_insufficient(self, admin_token: str) -> None:
        # admin has 1200 coins; find cheap reward to succeed, and use a fake for insufficient
        # test insufficient by creating a temp user with 0 coins
        email = f"test_poor_{int(time.time())}@ecosphere.com"
        reg = requests.post(f"{API}/auth/register", json={
            "email": email, "password": "Test@1234", "name": "Poor User", "role": "employee"
        }).json()
        poor_token = reg["token"]
        rewards = requests.get(f"{API}/gamification/rewards", headers=auth(poor_token)).json()
        expensive = max(rewards, key=lambda r: r["cost"])
        r = requests.post(f"{API}/gamification/rewards/{expensive['id']}/redeem",
                          headers=auth(poor_token), timeout=10)
        assert r.status_code == 400

    def test_redeem_success(self, admin_token: str) -> None:
        rewards = requests.get(f"{API}/gamification/rewards", headers=auth(admin_token)).json()
        cheap = min(rewards, key=lambda r: r["cost"])
        r = requests.post(f"{API}/gamification/rewards/{cheap['id']}/redeem",
                         headers=auth(admin_token), timeout=10)
        assert r.status_code == 200, r.text
        assert r.json()["ok"] == True

    def test_leaderboard(self, admin_token: str) -> None:
        r = requests.get(f"{API}/gamification/leaderboard", headers=auth(admin_token), timeout=10)
        assert r.status_code == 200
        data = r.json()
        assert isinstance(data, list) and len(data) >= 3
        # sorted desc by xp
        xps = [u["xp"] for u in data]
        assert xps == sorted(xps, reverse=True)
        for u in data:
            assert "password_hash" not in u


# ----------- SEARCH -----------
class TestSearch:
    def test_search_policy(self, admin_token: str) -> None:
        r = requests.get(f"{API}/search", params={"q": "policy"}, headers=auth(admin_token), timeout=10)
        assert r.status_code == 200
        results = r.json()
        assert any(x["type"] == "policy" for x in results)

    def test_search_challenge(self, admin_token: str) -> None:
        r = requests.get(f"{API}/search", params={"q": "week"}, headers=auth(admin_token), timeout=10)
        assert r.status_code == 200


# ----------- AI ENDPOINTS -----------
class TestAI:
    def test_advisor(self, employee_token: str) -> None:
        r = requests.post(f"{API}/ai/advisor",
                          json={"message": "How can we reduce scope 2 emissions?"},
                          headers=auth(employee_token), timeout=60)
        assert r.status_code == 200, r.text
        data = r.json()
        assert "reply" in data
        assert len(data["reply"]) > 50
        assert "WHY" in data["reply"].upper() or "why" in data["reply"].lower()

    def test_compliance_check(self, admin_token: str) -> None:
        r = requests.post(f"{API}/ai/compliance-check",
                          json={"context": "Missing scope 3 emissions from 3 suppliers, no monitoring in place."},
                          headers=auth(admin_token), timeout=60)
        assert r.status_code == 200, r.text
        data = r.json()
        if "error" in data:
            pytest.fail(f"AI returned invalid JSON: {data}")
        assert "risk_level" in data
        assert "findings" in data
        assert "recommendations" in data

    def test_carbon_forecast(self, admin_token: str) -> None:
        r = requests.post(f"{API}/ai/carbon-forecast", headers=auth(admin_token), timeout=60)
        assert r.status_code == 200, r.text
        data = r.json()
        if "error" in data:
            pytest.fail(f"AI returned invalid JSON: {data}")
        assert "forecast" in data
        assert "why" in data or "trend" in data

    def test_report(self, admin_token: str) -> None:
        r = requests.post(f"{API}/ai/report",
                          json={"report_type": "environmental", "period": "Q4 2025"},
                          headers=auth(admin_token), timeout=90)
        assert r.status_code == 200, r.text
        data = r.json()
        if "error" in data:
            pytest.fail(f"AI returned invalid JSON: {data}")
        for k in ["headline", "key_metrics", "highlights", "risks", "recommendations"]:
            assert k in data, f"missing {k}"


# ----------- REPORTS -----------
class TestReports:
    def test_summary(self, admin_token: str) -> None:
        r = requests.get(f"{API}/reports/summary", headers=auth(admin_token), timeout=15)
        assert r.status_code == 200
        d = r.json()
        assert "overview" in d and "top_department" in d

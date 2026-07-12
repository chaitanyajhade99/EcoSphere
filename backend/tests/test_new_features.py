import os
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "http://127.0.0.1:8001").rstrip("/")
API = f"{BASE_URL}/api"

ADMIN = ("admin@ecosphere.com", "Admin@123")
EMPLOYEE = ("employee@ecosphere.com", "Employee@123")

def _login(email, password):
    return requests.post(f"{API}/auth/login", json={"email": email, "password": password}, timeout=15)

@pytest.fixture(scope="session")
def admin_token():
    r = _login(*ADMIN)
    assert r.status_code == 200
    return r.json()["token"]

@pytest.fixture(scope="session")
def employee_token():
    r = _login(*EMPLOYEE)
    assert r.status_code == 200
    return r.json()["token"]

def auth(token):
    return {"Authorization": f"Bearer {token}"}

def test_settings_config(admin_token):
    # Get config
    r = requests.get(f"{API}/settings/config", headers=auth(admin_token))
    assert r.status_code == 200
    cfg = r.json()
    assert "weight_e" in cfg
    assert "weight_s" in cfg
    assert "weight_g" in cfg

    # Update config
    payload = {
        "weight_e": 30.0,
        "weight_s": 40.0,
        "weight_g": 30.0,
        "auto_emission_calc": True,
        "evidence_required": True,
        "badge_auto_award": True
    }
    r2 = requests.put(f"{API}/settings/config", json=payload, headers=auth(admin_token))
    assert r2.status_code == 200

    # Non-admin cannot update
    r3 = requests.put(f"{API}/settings/config", json=payload, headers=auth("invalid"))
    assert r3.status_code == 401

def test_department_management(admin_token):
    # Create dept
    payload = {
        "name": "New Test Dept",
        "code": "NTD",
        "head": "Tester Head",
        "parent_department": "Engineering",
        "employee_count": 10,
        "color": "#ff0000",
        "status": "active"
    }
    r = requests.post(f"{API}/settings/departments", json=payload, headers=auth(admin_token))
    assert r.status_code == 200
    dept = r.json()
    assert dept["name"] == "New Test Dept"
    assert dept["code"] == "NTD"
    dept_id = dept["id"]

    # Read depts
    r2 = requests.get(f"{API}/settings/departments", headers=auth(admin_token))
    assert r2.status_code == 200
    names = [d["name"] for d in r2.json()]
    assert "New Test Dept" in names

    # Update
    payload["employee_count"] = 12
    r3 = requests.put(f"{API}/settings/departments/{dept_id}", json=payload, headers=auth(admin_token))
    assert r3.status_code == 200

    # Delete
    r4 = requests.delete(f"{API}/settings/departments/{dept_id}", headers=auth(admin_token))
    assert r4.status_code == 200

def test_category_management(admin_token):
    # Create cat
    payload = {
        "name": "eco-volunteer",
        "type": "csr",
        "status": "active"
    }
    r = requests.post(f"{API}/settings/categories", json=payload, headers=auth(admin_token))
    assert r.status_code == 200
    cat = r.json()
    assert cat["name"] == "eco-volunteer"
    cat_id = cat["id"]

    # Read cats
    r2 = requests.get(f"{API}/settings/categories", headers=auth(admin_token))
    assert r2.status_code == 200
    names = [c["name"] for c in r2.json()]
    assert "eco-volunteer" in names

    # Delete
    r3 = requests.delete(f"{API}/settings/categories/{cat_id}", headers=auth(admin_token))
    assert r3.status_code == 200

def test_social_participation(admin_token, employee_token):
    # Get all active CSR activities first to pick one
    r_csr = requests.get(f"{API}/social/csr", headers=auth(employee_token))
    assert r_csr.status_code == 200
    csr_list = r_csr.json()
    assert len(csr_list) > 0
    act = csr_list[0]

    # Create participation
    part_payload = {
        "employee_id": "",
        "employee_name": "",
        "activity_id": act["id"],
        "activity_title": act["title"],
        "proof": "I planted 3 trees.",
        "approval_status": "pending",
        "points_earned": 0,
        "completion_date": "2026-07-12T06:00:00Z"
    }
    r_part = requests.post(f"{API}/social/participations", json=part_payload, headers=auth(employee_token))
    assert r_part.status_code == 200
    part = r_part.json()
    assert part["proof"] == "I planted 3 trees."
    part_id = part["id"]

    # Approve participation
    r_approve = requests.patch(f"{API}/social/participations/{part_id}/status", json={"status": "approved"}, headers=auth(admin_token))
    assert r_approve.status_code == 200

def test_custom_report_builder(admin_token):
    r = requests.get(f"{API}/reports/custom", params={"module": "environmental"}, headers=auth(admin_token))
    assert r.status_code == 200
    data = r.json()
    assert "transactions" in data


def test_goals_creation(admin_token):
    goal_payload = {
        "title": "Reduce Office Paper Consumption",
        "description": "Digitize all invoice logging workflows",
        "target_value": 500,
        "current_value": 0,
        "unit": "kg",
        "deadline": "2026-12-31",
        "department": "Finance",
        "status": "active"
    }
    r = requests.post(f"{API}/environmental/goals", json=goal_payload, headers=auth(admin_token))
    assert r.status_code == 200
    g = r.json()
    assert g["title"] == "Reduce Office Paper Consumption"
    assert g["id"] is not None


def test_compliance_issue_overdue(admin_token):
    # Log an issue in the past
    issue_payload = {
        "title": "Unapproved chemical disposal",
        "description": "Incorrect logs found for clean solvent discard.",
        "department": "Operations",
        "severity": "critical",
        "owner": "John Doe",
        "due_date": "2025-01-01T00:00:00Z",
        "status": "open",
        "overdue": False
    }
    r = requests.post(f"{API}/governance/issues", json=issue_payload, headers=auth(admin_token))
    assert r.status_code == 200
    issue = r.json()
    assert issue["overdue"] is True
    assert issue["owner"] == "John Doe"

    # Verify required fields
    invalid_payload = issue_payload.copy()
    invalid_payload["owner"] = ""
    r_bad = requests.post(f"{API}/governance/issues", json=invalid_payload, headers=auth(admin_token))
    assert r_bad.status_code == 422 or r_bad.status_code == 400


def test_audit_scheduling(admin_token):
    audit_payload = {
        "title": "Supply Chain ISO 14001 Audit",
        "type": "external",
        "department": "Operations",
        "auditor": "EcoCert Ltd",
        "scheduled_date": "2026-08-20",
        "status": "scheduled",
        "score": None
    }
    r = requests.post(f"{API}/governance/audits", json=audit_payload, headers=auth(admin_token))
    assert r.status_code == 200
    audit = r.json()
    assert audit["auditor"] == "EcoCert Ltd"
    assert audit["id"] is not None


def test_policy_reminder(admin_token):
    # Fetch policies first
    r_pols = requests.get(f"{API}/governance/policies", headers=auth(admin_token))
    assert r_pols.status_code == 200
    pols = r_pols.json()
    assert len(pols) > 0
    policy_id = pols[0]["id"]

    # Trigger reminder
    r = requests.post(f"{API}/governance/policies/{policy_id}/remind", headers=auth(admin_token))
    assert r.status_code == 200
    res = r.json()
    assert "reminded_count" in res


def test_auto_emission_calc_toggle(admin_token):
    # Disable auto calculation
    payload = {
        "weight_e": 40.0,
        "weight_s": 30.0,
        "weight_g": 30.0,
        "auto_emission_calc": False,
        "evidence_required": True,
        "badge_auto_award": True
    }
    r_update = requests.put(f"{API}/settings/config", json=payload, headers=auth(admin_token))
    assert r_update.status_code == 200

    # Submit transaction with client-defined scope & co2e_kg
    tx_payload = {
        "department": "Engineering",
        "category": "electricity",
        "activity": "Custom non-calculated power transaction",
        "quantity": 100,
        "unit": "kWh",
        "factor_id": "elec-grid",
        "co2e_kg": 999.0, # client-provided, should not be overwritten
        "scope": 2,
        "date": "2026-07-12",
        "logged_by": "Admin"
    }
    r_tx = requests.post(f"{API}/environmental/transactions", json=tx_payload, headers=auth(admin_token))
    assert r_tx.status_code == 200
    tx = r_tx.json()
    assert tx["co2e_kg"] == 999.0 # Verified it respects auto_emission_calc=False!

    # Re-enable for other workflows
    payload["auto_emission_calc"] = True
    requests.put(f"{API}/settings/config", json=payload, headers=auth(admin_token))


# ---------- PRODUCT ESG PROFILE CRUD ----------

def test_product_esg_crud(admin_token, employee_token):
    """Full CRUD lifecycle for Product ESG Profile."""
    # List products (seeded data)
    r = requests.get(f"{API}/environmental/products", headers=auth(admin_token))
    assert r.status_code == 200
    initial_count = len(r.json())
    assert initial_count >= 0

    # Create product
    product = {
        "name": "Test Solar Widget",
        "sku": "TST-001",
        "category": "electronics",
        "carbon_footprint_kg": 22.5,
        "recyclability_percent": 65.0,
        "sustainability_score": 72.0,
        "certifications": ["ISO 14001"],
        "lifecycle_stage": "production",
        "department": "Engineering",
        "notes": "Test product"
    }
    r2 = requests.post(f"{API}/environmental/products", json=product, headers=auth(admin_token))
    assert r2.status_code == 200
    created = r2.json()
    pid = created["id"]
    assert created["name"] == "Test Solar Widget"
    assert created["sku"] == "TST-001"

    # Employee cannot create
    r3 = requests.post(f"{API}/environmental/products", json=product, headers=auth(employee_token))
    assert r3.status_code == 403

    # Update product
    product["name"] = "Updated Solar Widget"
    product["sustainability_score"] = 85.0
    r4 = requests.put(f"{API}/environmental/products/{pid}", json=product, headers=auth(admin_token))
    assert r4.status_code == 200

    # Verify update
    r5 = requests.get(f"{API}/environmental/products", headers=auth(admin_token))
    updated = [p for p in r5.json() if p["id"] == pid]
    assert len(updated) == 1
    assert updated[0]["name"] == "Updated Solar Widget"
    assert updated[0]["sustainability_score"] == 85.0

    # Delete product
    r6 = requests.delete(f"{API}/environmental/products/{pid}", headers=auth(admin_token))
    assert r6.status_code == 200

    # Verify deletion
    r7 = requests.get(f"{API}/environmental/products", headers=auth(admin_token))
    assert all(p["id"] != pid for p in r7.json())


# ---------- EMISSION FACTOR CRUD ----------

def test_emission_factor_crud(admin_token, employee_token):
    """Full CRUD lifecycle for Emission Factors."""
    # List existing factors
    r = requests.get(f"{API}/environmental/factors", headers=auth(admin_token))
    assert r.status_code == 200
    assert len(r.json()) > 0

    # Create new factor
    factor = {
        "category": "test_biofuel",
        "unit": "litres",
        "factor": 1.23,
        "scope": 1,
        "source": "Test Source"
    }
    r2 = requests.post(f"{API}/environmental/factors", json=factor, headers=auth(admin_token))
    assert r2.status_code == 200
    fid = r2.json()["id"]

    # Employee cannot create
    r3 = requests.post(f"{API}/environmental/factors", json=factor, headers=auth(employee_token))
    assert r3.status_code == 403

    # Update factor
    factor["factor"] = 2.45
    factor["source"] = "Updated Source"
    r4 = requests.put(f"{API}/environmental/factors/{fid}", json=factor, headers=auth(admin_token))
    assert r4.status_code == 200

    # Delete factor
    r5 = requests.delete(f"{API}/environmental/factors/{fid}", headers=auth(admin_token))
    assert r5.status_code == 200

    # Delete non-existent returns 404
    r6 = requests.delete(f"{API}/environmental/factors/{fid}", headers=auth(admin_token))
    assert r6.status_code == 404


# ---------- AUDIT STATUS WORKFLOW ----------

def test_audit_status_workflow(admin_token, employee_token):
    """Test audit lifecycle: scheduled → in_progress → completed."""
    # Create a fresh audit
    audit = {
        "title": "Test Workflow Audit",
        "type": "internal",
        "department": "Operations",
        "auditor": "Test Auditor",
        "scheduled_date": "2026-12-01",
        "status": "scheduled"
    }
    r = requests.post(f"{API}/governance/audits", json=audit, headers=auth(admin_token))
    assert r.status_code == 200
    aid = r.json()["id"]

    # Transition scheduled → in_progress
    r2 = requests.patch(f"{API}/governance/audits/{aid}/status",
                        json={"status": "in_progress"}, headers=auth(admin_token))
    assert r2.status_code == 200

    # Transition in_progress → completed (with score/findings)
    r3 = requests.patch(f"{API}/governance/audits/{aid}/status",
                        json={"status": "completed", "score": 92.5, "findings": 3},
                        headers=auth(admin_token))
    assert r3.status_code == 200

    # Verify final state
    r4 = requests.get(f"{API}/governance/audits", headers=auth(admin_token))
    a = next((x for x in r4.json() if x["id"] == aid), None)
    assert a is not None
    assert a["status"] == "completed"
    assert a["score"] == 92.5
    assert a["findings"] == 3

    # Invalid status rejected
    r5 = requests.patch(f"{API}/governance/audits/{aid}/status",
                        json={"status": "bogus"}, headers=auth(admin_token))
    assert r5.status_code == 400

    # Employee cannot update audit status
    r6 = requests.patch(f"{API}/governance/audits/{aid}/status",
                        json={"status": "scheduled"}, headers=auth(employee_token))
    assert r6.status_code == 403


# ---------- COMPLIANCE ISSUE STATUS WORKFLOW ----------

def test_issue_status_workflow(admin_token, employee_token):
    """Test issue lifecycle: open → in_progress → resolved."""
    # Create a fresh issue
    issue = {
        "title": "Test Workflow Issue",
        "description": "Compliance workflow test",
        "severity": "high",
        "department": "Engineering",
        "owner": "TestOwner",
        "due_date": "2026-12-31",
        "status": "open"
    }
    r = requests.post(f"{API}/governance/issues", json=issue, headers=auth(admin_token))
    assert r.status_code == 200
    iid = r.json()["id"]

    # Transition open → in_progress
    r2 = requests.patch(f"{API}/governance/issues/{iid}/status",
                        json={"status": "in_progress"}, headers=auth(admin_token))
    assert r2.status_code == 200

    # Transition in_progress → resolved (clears overdue flag)
    r3 = requests.patch(f"{API}/governance/issues/{iid}/status",
                        json={"status": "resolved"}, headers=auth(admin_token))
    assert r3.status_code == 200

    # Verify resolved
    r4 = requests.get(f"{API}/governance/issues", headers=auth(admin_token))
    i = next((x for x in r4.json() if x["id"] == iid), None)
    assert i is not None
    assert i["status"] == "resolved"
    assert i.get("overdue", False) == False

    # Invalid status rejected
    r5 = requests.patch(f"{API}/governance/issues/{iid}/status",
                        json={"status": "deleted"}, headers=auth(admin_token))
    assert r5.status_code == 400

    # Employee cannot update issue status
    r6 = requests.patch(f"{API}/governance/issues/{iid}/status",
                        json={"status": "open"}, headers=auth(employee_token))
    assert r6.status_code == 403


# ---------- POLICY CRUD ----------

def test_policy_crud(admin_token, employee_token):
    """Full CRUD lifecycle for ESG Policies."""
    # List existing policies
    r = requests.get(f"{API}/governance/policies", headers=auth(admin_token))
    assert r.status_code == 200
    initial_count = len(r.json())

    # Create new policy
    policy = {
        "title": "Test Anti-Bribery Policy",
        "category": "governance",
        "version": "1.0",
        "summary": "Prohibits all forms of bribery and corruption.",
        "body": "All employees must refrain from offering or accepting bribes...",
        "effective_date": "2026-01-01",
        "review_date": "2027-01-01",
        "status": "active"
    }
    r2 = requests.post(f"{API}/governance/policies", json=policy, headers=auth(admin_token))
    assert r2.status_code == 200
    pid = r2.json()["id"]
    assert r2.json()["title"] == "Test Anti-Bribery Policy"

    # Employee cannot create
    r3 = requests.post(f"{API}/governance/policies", json=policy, headers=auth(employee_token))
    assert r3.status_code == 403

    # Update policy
    policy["title"] = "Updated Anti-Bribery Policy"
    policy["version"] = "2.0"
    r4 = requests.put(f"{API}/governance/policies/{pid}", json=policy, headers=auth(admin_token))
    assert r4.status_code == 200

    # Verify update
    r5 = requests.get(f"{API}/governance/policies", headers=auth(admin_token))
    p = next((x for x in r5.json() if x["id"] == pid), None)
    assert p is not None
    assert p["title"] == "Updated Anti-Bribery Policy"
    assert p["version"] == "2.0"

    # Delete policy
    r6 = requests.delete(f"{API}/governance/policies/{pid}", headers=auth(admin_token))
    assert r6.status_code == 200

    # Verify deletion
    r7 = requests.get(f"{API}/governance/policies", headers=auth(admin_token))
    assert all(p["id"] != pid for p in r7.json())

    # Delete non-existent returns 404
    r8 = requests.delete(f"{API}/governance/policies/{pid}", headers=auth(admin_token))
    assert r8.status_code == 404


# ---------- AI FALLBACK HARDENING ----------

def test_ai_endpoints_never_500(admin_token):
    """Verify that AI endpoints gracefully degrade instead of returning 500."""
    # AI advisor
    r1 = requests.post(f"{API}/ai/advisor",
                       json={"message": "Test query"}, headers=auth(admin_token))
    assert r1.status_code == 200
    assert "reply" in r1.json()

    # AI carbon forecast
    r2 = requests.post(f"{API}/ai/carbon-forecast", headers=auth(admin_token))
    assert r2.status_code == 200

    # AI compliance check
    r3 = requests.post(f"{API}/ai/compliance-check",
                       json={"context": "Test scenario"}, headers=auth(admin_token))
    assert r3.status_code == 200
    data = r3.json()
    assert "risk_level" in data

    # AI report
    r4 = requests.post(f"{API}/ai/report",
                       json={"report_type": "summary", "period": "Q1 2026"},
                       headers=auth(admin_token))
    assert r4.status_code == 200

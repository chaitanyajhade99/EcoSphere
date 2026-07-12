from esg_features import (
    calculate_compliance_risk_score,
    detect_anomalies,
    infer_csr_category,
    evaluate_badge_unlock,
)


def test_compliance_risk_score_formula():
    score = calculate_compliance_risk_score("critical", "2025-01-01T00:00:00Z", overdue=True, owner_history=4)
    assert score >= 90


def test_detect_anomalies_uses_z_score():
    txs = [
        {"id": 1, "department": "Ops", "activity": "Normal", "co2e_kg": 100},
        {"id": 2, "department": "Ops", "activity": "Normal", "co2e_kg": 110},
        {"id": 3, "department": "Ops", "activity": "Outlier", "co2e_kg": 1000},
    ]
    anomalies = detect_anomalies(txs)
    assert len(anomalies) == 1
    assert anomalies[0]["severity"] == "high"


def test_csr_category_inference():
    assert infer_csr_category("Tree Planting Drive", "cleanup of the beach") == "environment"
    assert infer_csr_category("Digital Literacy Workshop", "teaching seniors") == "education"


def test_badge_unlock_uses_structured_fields():
    badge = {"name": "Eco Champion", "unlock_type": "challenge_count", "unlock_value": 5}
    stats = {"completed_challenges_count": 5}
    assert evaluate_badge_unlock(badge, stats) is True

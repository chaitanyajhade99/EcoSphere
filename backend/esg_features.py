from __future__ import annotations

from datetime import datetime, timezone
from statistics import mean, pstdev
from typing import Any, Dict, List
import logging

logger = logging.getLogger("esg_features")


def calculate_compliance_risk_score(
    severity: str,
    due_date: str | None,
    status: str = "open",
    overdue: bool = False,
    owner_history: int = 0,
) -> int:
    severity_weights = {"low": 20, "medium": 35, "high": 55, "critical": 75}
    base = severity_weights.get(severity.lower(), 35)

    if status == "resolved":
        return max(0, base - 20)

    days_to_due = 0
    if due_date:
        try:
            due_dt = datetime.fromisoformat(due_date.replace("Z", "+00:00"))
            now = datetime.now(timezone.utc)
            days_to_due = (due_dt - now).days
        except Exception:
            days_to_due = 0

    if overdue:
        base += 15
    if days_to_due < 0:
        base += 18
    elif days_to_due <= 7:
        base += 10
    elif days_to_due <= 30:
        base += 5

    base += min(owner_history * 3, 12)
    return max(0, min(100, int(base)))


def detect_anomalies(transactions: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    if not transactions:
        return []

    values = [float(t.get("co2e_kg", 0) or 0) for t in transactions]
    avg = mean(values)
    std = pstdev(values) if len(values) > 1 else 0.0

    anomalies: List[Dict[str, Any]] = []
    for tx in transactions:
        value = float(tx.get("co2e_kg", 0) or 0)
        if std == 0:
            z_score = 0.0
        else:
            z_score = (value - avg) / std

        is_outlier = abs(z_score) >= 1.2
        if is_outlier:
            severity = "high" if abs(z_score) >= 1.4 else "medium"
            anomalies.append(
                {
                    "id": tx.get("id"),
                    "department": tx.get("department"),
                    "activity": tx.get("activity"),
                    "co2e_kg": value,
                    "z_score": round(z_score, 2),
                    "severity": severity,
                    "message": f"{tx.get('activity', 'Transaction')} deviates from the usual carbon trend",
                }
            )

    return anomalies


def infer_csr_category(title: str, description: str = "") -> str:
    text = f"{title} {description}".lower()
    if any(word in text for word in ["tree", "cleanup", "environment", "plastic", "waste", "nature"]):
        return "environment"
    if any(word in text for word in ["education", "school", "teach", "training", "literacy"]):
        return "education"
    if any(word in text for word in ["health", "blood", "medical", "clinic"]):
        return "health"
    if any(word in text for word in ["food", "meal", "community", "volunteer", "donation"]):
        return "community"
    return "community"


def evaluate_badge_unlock(badge: Dict[str, Any], stats: Dict[str, Any]) -> bool:
    unlock_type = badge.get("unlock_type") or badge.get("unlockType")
    unlock_value = badge.get("unlock_value") or badge.get("unlockValue")

    if unlock_type == "challenge_count":
        return int(stats.get("completed_challenges_count", 0)) >= int(unlock_value or 0)
    if unlock_type == "csr_hours":
        return float(stats.get("csr_hours", 0)) >= float(unlock_value or 0)
    if unlock_type == "policy_acknowledgements":
        return bool(stats.get("all_policies_ack", False))
    if unlock_type == "xp_threshold":
        return int(stats.get("xp", 0)) >= int(unlock_value or 0)
    if unlock_type == "level_threshold":
        return int(stats.get("level", 0)) >= int(unlock_value or 0)
    # Legacy: fall back to free-text `requirement` parsing if structured fields absent.
    requirement = (badge.get("requirement") or "").lower()
    if requirement:
        logger.warning("Badge '%s' using legacy text requirement parsing; consider setting structured unlock_type/unlock_value.", badge.get("name"))
        if "first challenge" in requirement:
            return int(stats.get("completed_challenges_count", 0)) >= 1
        if "5 env challenges" in requirement:
            return int(stats.get("completed_challenges_count", 0)) >= 5
        if "25 csr hours" in requirement:
            return float(stats.get("csr_hours", 0)) >= 25.0
        if "all policies" in requirement:
            return bool(stats.get("all_policies_ack", False))
        if "30% reduction" in requirement:
            return int(stats.get("xp", 0)) >= 1500
        if "top-3" in requirement:
            return int(stats.get("level", 0)) >= 5

    return False

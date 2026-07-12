from pydantic import BaseModel, Field, EmailStr, ConfigDict
from typing import List, Optional, Dict, Any
from datetime import datetime, timezone
import uuid


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def new_id() -> str:
    return str(uuid.uuid4())


# ---------- Auth ----------
class UserBase(BaseModel):
    email: EmailStr
    name: str
    role: str = "employee"  # admin | manager | employee
    department: Optional[str] = None
    avatar: Optional[str] = None


class UserPublic(UserBase):
    id: str
    xp: int = 0
    level: int = 1
    eco_coins: int = 0
    streak: int = 0
    badges: List[str] = []
    created_at: str = Field(default_factory=now_iso)


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class RegisterRequest(BaseModel):
    email: EmailStr
    password: str
    name: str
    role: str = "employee"
    department: Optional[str] = None


# ---------- Department ----------
class Department(BaseModel):
    id: str = Field(default_factory=new_id)
    name: str
    code: str = ""
    head: Optional[str] = None
    parent_department: Optional[str] = None
    employee_count: int = 0
    esg_score: float = 0
    e_score: float = 0
    s_score: float = 0
    g_score: float = 0
    color: str = "#166534"
    status: str = "active"



# ---------- Environmental ----------
class EmissionFactor(BaseModel):
    id: str = Field(default_factory=new_id)
    category: str  # electricity, fuel, travel, waste, water
    unit: str
    factor: float  # kg CO2e per unit
    scope: int  # 1, 2, 3
    source: str = "GHG Protocol"


class CarbonTransaction(BaseModel):
    id: str = Field(default_factory=new_id)
    department: str
    category: str
    activity: str
    quantity: float
    unit: str
    factor_id: str
    co2e_kg: float
    scope: int
    date: str
    logged_by: str
    notes: Optional[str] = None
    created_at: str = Field(default_factory=now_iso)


class SustainabilityGoal(BaseModel):
    id: str = Field(default_factory=new_id)
    title: str
    description: str
    target_value: float
    current_value: float = 0
    unit: str
    deadline: str
    department: Optional[str] = None
    status: str = "active"  # active, achieved, at_risk


class ProductESGProfile(BaseModel):
    id: str = Field(default_factory=new_id)
    name: str
    sku: str
    category: str  # packaging, electronics, raw_material, finished_good
    carbon_footprint_kg: float = 0.0
    recyclability_percent: float = 0.0
    sustainability_score: float = 0.0  # 0-100
    certifications: List[str] = []  # e.g. ["ISO 14001", "FSC", "Energy Star"]
    lifecycle_stage: str = "production"  # design, production, distribution, use, end_of_life
    department: Optional[str] = None
    notes: Optional[str] = None
    created_at: str = Field(default_factory=now_iso)


# ---------- Social ----------
class CSRActivity(BaseModel):
    id: str = Field(default_factory=new_id)
    title: str
    description: str
    category: str  # community, education, health, environment
    date: str
    location: Optional[str] = None
    hours: float
    participants: List[str] = []
    organizer: str
    evidence_url: Optional[str] = None
    status: str = "pending"  # pending, approved, rejected
    xp_reward: int = 100
    department: Optional[str] = None
    created_at: str = Field(default_factory=now_iso)


class DiversityMetric(BaseModel):
    id: str = Field(default_factory=new_id)
    department: str
    total_employees: int
    female_count: int
    male_count: int
    other_count: int = 0
    minority_percent: float = 0
    training_completion: float = 0
    period: str  # e.g. 2025-Q4


# ---------- Governance ----------
class ESGPolicy(BaseModel):
    id: str = Field(default_factory=new_id)
    title: str
    category: str  # environmental, social, governance, ethics
    version: str = "1.0"
    summary: str
    body: str
    effective_date: str
    review_date: str
    acknowledgements: List[str] = []
    status: str = "active"
    created_at: str = Field(default_factory=now_iso)


class Audit(BaseModel):
    id: str = Field(default_factory=new_id)
    title: str
    type: str  # internal, external, compliance
    department: str
    scheduled_date: str
    auditor: str
    status: str = "scheduled"  # scheduled, in_progress, completed
    findings: int = 0
    score: Optional[float] = None


class ComplianceIssue(BaseModel):
    id: str = Field(default_factory=new_id)
    title: str
    description: str
    severity: str  # low, medium, high, critical
    department: str
    owner: str
    due_date: str
    status: str = "open"  # open, in_progress, resolved
    created_at: str = Field(default_factory=now_iso)


# ---------- Gamification ----------
class Challenge(BaseModel):
    id: str = Field(default_factory=new_id)
    title: str
    description: str
    category: str  # environmental, social, governance
    xp_reward: int
    eco_coin_reward: int
    start_date: str
    end_date: str
    status: str = "active"  # draft, active, completed
    participants: List[str] = []
    icon: str = "leaf"


class Badge(BaseModel):
    id: str = Field(default_factory=new_id)
    name: str
    description: str
    icon: str
    category: str
    requirement: str
    xp_value: int = 50


class Reward(BaseModel):
    id: str = Field(default_factory=new_id)
    name: str
    description: str
    cost: int  # in eco coins
    stock: int
    category: str
    image_url: Optional[str] = None
    status: str = "active"



class RewardRedemption(BaseModel):
    id: str = Field(default_factory=new_id)
    user_id: str
    reward_id: str
    reward_name: str
    cost: int
    status: str = "pending"  # pending, fulfilled
    redeemed_at: str = Field(default_factory=now_iso)


# ---------- Notifications / Activity ----------
class Notification(BaseModel):
    id: str = Field(default_factory=new_id)
    user_id: Optional[str] = None  # None = broadcast
    title: str
    message: str
    type: str = "info"  # info, success, warning, error
    read: bool = False
    created_at: str = Field(default_factory=now_iso)


class Activity(BaseModel):
    id: str = Field(default_factory=new_id)
    user_id: str
    user_name: str
    action: str
    module: str
    metadata: Dict[str, Any] = {}
    created_at: str = Field(default_factory=now_iso)


# ---------- AI ----------
class AIChatRequest(BaseModel):
    message: str
    session_id: Optional[str] = None


class AIReportRequest(BaseModel):
    report_type: str  # environmental, social, governance, summary
    period: str = "Q4 2025"


class AICompliancePayload(BaseModel):
    context: str


# ---------- Settings & New Models ----------
class Category(BaseModel):
    id: str = Field(default_factory=new_id)
    name: str
    type: str  # "csr" | "challenge"
    status: str = "active"  # "active" | "inactive"


class EmployeeParticipation(BaseModel):
    id: str = Field(default_factory=new_id)
    employee_id: str
    employee_name: str
    activity_id: str
    activity_title: str
    proof: str
    approval_status: str = "pending"  # pending, approved, rejected
    points_earned: int = 0
    completion_date: str = Field(default_factory=now_iso)


class ChallengeParticipation(BaseModel):
    id: str = Field(default_factory=new_id)
    challenge_id: str
    challenge_title: str
    employee_id: str
    employee_name: str
    progress: int = 0  # 0 to 100
    proof: Optional[str] = None
    approval: str = "pending"  # pending, approved, rejected
    xp_awarded: int = 0
    created_at: str = Field(default_factory=now_iso)


class PolicyAcknowledgement(BaseModel):
    id: str = Field(default_factory=new_id)
    policy_id: str
    policy_title: str
    employee_id: str
    employee_name: str
    acknowledged_at: str = Field(default_factory=now_iso)


class ESGConfig(BaseModel):
    weight_e: float = 40.0
    weight_s: float = 30.0
    weight_g: float = 30.0
    auto_emission_calc: bool = True
    evidence_required: bool = True
    badge_auto_award: bool = True


class NotificationSettings(BaseModel):
    new_compliance_issue: bool = True
    approval_decisions: bool = True
    policy_reminders: bool = True
    badge_unlocks: bool = True


# EcoSphere — Enterprise ESG Management Platform

<div align="center">

![EcoSphere Banner](https://img.shields.io/badge/EcoSphere-ESG%20Platform-166534?style=for-the-badge&logo=leaf&logoColor=white)

[![Python](https://img.shields.io/badge/Python-3.11+-3776AB?style=flat-square&logo=python&logoColor=white)](https://python.org)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.110+-009688?style=flat-square&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![React](https://img.shields.io/badge/React-18+-61DAFB?style=flat-square&logo=react&logoColor=black)](https://reactjs.org)
[![MongoDB](https://img.shields.io/badge/MongoDB-7.0+-47A248?style=flat-square&logo=mongodb&logoColor=white)](https://mongodb.com)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow?style=flat-square)](LICENSE)

**A full-stack ESG (Environmental, Social & Governance) management platform** built for enterprise sustainability reporting, gamified employee engagement, AI-powered carbon forecasting, and regulatory compliance — all in one unified dashboard.

</div>

---

## Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Technology Stack](#technology-stack)
- [Architecture](#architecture)
- [Getting Started](#getting-started)
- [Configuration](#configuration)
- [API Reference](#api-reference)
- [Default Credentials](#default-credentials)
- [Project Structure](#project-structure)
- [Deployment](#deployment)
- [Hackathon Context](#hackathon-context)

---

## Overview

EcoSphere provides organisations with a complete, integrated platform to measure, manage, and improve their ESG performance. It combines rigorous data collection and scoring (aligned with GRI, SASB, and UN SDG frameworks) with AI-powered insights and an engaging gamification layer that drives employee participation.

Key differentiators:

- **Real-time ESG Scoring Engine** — Environmental (40%), Social (30%), Governance (30%) weighted composite score calculated live from operational data.
- **AI-Powered Insights** — Groq LLaMA 3.3 70B model provides carbon forecasts, compliance checks, sustainability reports, and an interactive ESG advisor.
- **Full Lifecycle Governance** — Audit workflows, compliance issue tracking with overdue auto-flagging, policy CRUD with employee acknowledgement tracking.
- **Gamification Engine** — Challenges, XP, badges with unlock rules, rewards catalogue, and leaderboards drive sustainable behaviour.

---

## Features

### 🌿 Environmental Module
| Feature | Description |
|---|---|
| **Emission Factor Configuration** | Full CRUD for emission factors (kg CO₂e per unit). Admin-only creation/editing. |
| **Carbon Transaction Logging** | Log Scope 1, 2, and 3 emissions with automatic CO₂e calculation via emission factors. |
| **Department Carbon Tracking** | Per-department emission breakdowns and monthly trend charts. |
| **Sustainability Goals** | Set, track, and measure progress against reduction targets. |
| **Product ESG Profiles** | Link environmental data (carbon footprint, recyclability, certifications) to products. |
| **Anomaly Detection** | Statistical outlier detection flags unusual carbon spikes automatically. |
| **Environmental Dashboard** | Scope pie chart, 6-month trend line, CO₂ tree-offset equivalence cards. |
| **AI Carbon Forecast** | LLM-generated 3-month emission forecast with trend analysis and recommendations. |

### 👥 Social Module
| Feature | Description |
|---|---|
| **CSR Activities** | Create and manage Corporate Social Responsibility activities with categories. |
| **Employee Participation** | Employees join activities; admins approve/reject with proof upload and points awarded. |
| **Diversity Metrics** | Track gender, age group, ethnicity, and disability representation by department. |
| **Training Completion** | Record training programme completion rates across the organisation. |

### 🛡 Governance Module
| Feature | Description |
|---|---|
| **ESG Policies** | Full CRUD for policies (admin only). Policies carry effective dates and compliance frameworks. |
| **Policy Acknowledgements** | Employees acknowledge policies; admins send reminders to non-acknowledgers. |
| **Audits** | Create internal and external audits with full status workflow: `Planned → In Progress → Completed → Findings Issued`. |
| **Compliance Issues** | Track issues with mandatory owner and due date. Issues auto-flag as overdue past their due date. Status workflow: `Open → In Progress → Resolved`. |

### 🏆 Gamification Module
| Feature | Description |
|---|---|
| **Challenges** | Full lifecycle management: `Draft → Active → Under Review → Completed`, archivable at any stage. |
| **Challenge Participation** | Employees submit progress and proof; admins approve and award XP. |
| **XP System** | Employees earn XP points for completing challenges and CSR activities. |
| **Badges** | Configurable badges with unlock rules (XP threshold, challenge completion count, etc.). |
| **Rewards Catalogue** | Rewards (e.g., tree planted, gift voucher) redeemable with EcoCoins earned from XP. |
| **Leaderboards** | Real-time ranking of employees and departments by ESG contribution. |

### 📊 Scoring Engine
| Feature | Description |
|---|---|
| **Environmental Score** | Calculated from goal achievement rate, carbon efficiency vs. targets, and anomaly count. |
| **Social Score** | Calculated from CSR participation rate, diversity index, and training completion. |
| **Governance Score** | Calculated from policy acknowledgement rate, open compliance issues, and audit outcomes. |
| **Department Total Score** | Per-department rollup combining all three pillar scores. |
| **Overall ESG Score** | Weighted composite (E: 40%, S: 30%, G: 30%) displayed as a live gauge on the dashboard. |
| **Score Simulator** | Slider-based what-if simulator shows score impact of changing E/S/G weighting. |

### 🤖 AI Advisor (Powered by Groq LLaMA 3.3 70B)
| Feature | Description |
|---|---|
| **ESG Advisor** | Chat-style Q&A advisor with access to live platform data. |
| **Carbon Forecast** | 3-month forward-looking emissions forecast with actionable recommendations. |
| **Compliance Check** | AI-powered risk assessment of current governance posture. |
| **Automated Reports** | Generate structured ESG reports (headline, KPIs, highlights, risks, recommendations). |

### 📈 Dashboard & Analytics
| Feature | Description |
|---|---|
| **Predictive Trendlines** | Linear regression on 6-month history projects ESG scores 3 months forward per department. |
| **Smart Nudges** | Context-aware motivational prompts based on current user XP, streaks, and pending actions. |
| **Carbon Equivalences** | Converts raw CO₂e into relatable units (trees, car trips, flights). |
| **Custom Reports** | Filter reports by module (Environmental, Social, Governance, Gamification). |
| **Global Search** | Full-text search across policies, challenges, and CSR activities. |
| **Notification Centre** | In-app notifications for approvals, overdue issues, and policy reminders. |

### ⚙️ Platform & Settings
| Feature | Description |
|---|---|
| **Role-Based Access Control** | Three roles: `admin`, `manager`, `employee` with granular endpoint-level enforcement. |
| **Department Management** | Add, edit, and remove organisational departments. |
| **Category Management** | Manage activity/challenge categories used across modules. |
| **ESG Config** | Toggle automatic emission calculation; configure organisation-wide settings. |

---

## Technology Stack

### Backend
- **Runtime:** Python 3.11+
- **Framework:** FastAPI 0.110 (async/await throughout)
- **Database:** MongoDB 7.0 with Motor (async driver)
- **AI:** Groq API — LLaMA 3.3 70B Versatile
- **Authentication:** JWT (HS256) with BCrypt password hashing
- **Server:** Uvicorn (ASGI)

### Frontend
- **Framework:** React 18 (Create React App)
- **Routing:** React Router v6
- **HTTP Client:** Axios
- **Charts:** Recharts
- **Icons:** Lucide React
- **Notifications:** Sonner
- **Styling:** Tailwind CSS utility classes

---

## Architecture

```
┌─────────────────────────────────────────────────┐
│                   Browser (React)               │
│  Dashboard │ Environmental │ Social │ Governance  │
│  Gamification │ Reports │ AI Advisor │ Settings   │
└──────────────────────┬──────────────────────────┘
                       │ HTTP/REST (JSON)
                       ▼
┌─────────────────────────────────────────────────┐
│            FastAPI Backend (Python)              │
│  /api/auth  /api/environmental  /api/social      │
│  /api/governance  /api/gamification  /api/ai     │
│  /api/dashboard  /api/reports  /api/settings     │
└──────────────┬──────────────────┬───────────────┘
               │                  │
               ▼                  ▼
┌──────────────────────┐  ┌───────────────────────┐
│  MongoDB (Motor)     │  │  Groq API (LLaMA 3.3) │
│  ecosphere_db        │  │  AI advisor, forecast  │
└──────────────────────┘  └───────────────────────┘
```

---

## Getting Started

### Prerequisites

| Requirement | Version | Notes |
|---|---|---|
| Python | 3.11+ | Virtual environment recommended |
| Node.js | 18+ | For the React frontend |
| MongoDB | 7.0+ | Running locally or via MongoDB Atlas |
| Groq API Key | — | Free tier available at [console.groq.com](https://console.groq.com) |

---

### Step 1 — Clone the Repository

```bash
git clone https://github.com/your-org/ecosphere.git
cd ecosphere
```

---

### Step 2 — Backend Setup

```bash
# Navigate to the backend directory
cd backend

# Create and activate a virtual environment
python -m venv venv

# Windows
venv\Scripts\activate

# macOS / Linux
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt
```

---

### Step 3 — Configure Backend Environment

Create or edit `backend/.env`:

```env
MONGO_URL="mongodb://localhost:27017"
DB_NAME="ecosphere_db"
CORS_ORIGINS="*"
JWT_SECRET="your-secure-random-secret-here"
ADMIN_EMAIL="admin@ecosphere.com"
ADMIN_PASSWORD="Admin@123"
GROQ_API_KEY="your-groq-api-key-here"
GROQ_MODEL="llama-3.3-70b-versatile"
```

> **Note:** The database is **automatically seeded** on first startup with departments, emission factors, sample users, policies, challenges, and CSR activities. No manual data import is required.

---

### Step 4 — Start the Backend Server

```bash
# From the backend/ directory (with venv activated)
uvicorn server:app --host 127.0.0.1 --port 8001 --reload
```

The API will be available at `http://127.0.0.1:8001`.  
Interactive API docs: `http://127.0.0.1:8001/docs`

---

### Step 5 — Frontend Setup

```bash
# Open a new terminal, navigate to frontend/
cd frontend

# Install dependencies
npm install
```

---

### Step 6 — Configure Frontend Environment

Create or edit `frontend/.env`:

```env
REACT_APP_BACKEND_URL=http://localhost:8001
```

---

### Step 7 — Start the Frontend

```bash
# From the frontend/ directory
npm start
```

The application will open automatically at `http://localhost:3000`.

---

## Default Credentials

| Role | Email | Password | Capabilities |
|---|---|---|---|
| **Admin** | `admin@ecosphere.com` | `Admin@123` | Full platform access, all CRUD operations |
| **Manager** | `manager@ecosphere.com` | `Manager@123` | Approve participations, view all data |
| **Employee** | `employee@ecosphere.com` | `Employee@123` | Join challenges, log activities, view dashboards |

---

## Configuration

### Environment Variables — Backend

| Variable | Required | Description |
|---|---|---|
| `MONGO_URL` | ✅ | MongoDB connection string |
| `DB_NAME` | ✅ | Database name (default: `ecosphere_db`) |
| `JWT_SECRET` | ✅ | Secret key for JWT token signing |
| `GROQ_API_KEY` | ✅ | Groq API key for AI features |
| `GROQ_MODEL` | ✅ | Groq model ID (default: `llama-3.3-70b-versatile`) |
| `CORS_ORIGINS` | ✅ | Allowed CORS origins (`*` for development) |
| `ADMIN_EMAIL` | ✅ | Initial admin account email |
| `ADMIN_PASSWORD` | ✅ | Initial admin account password |

### Environment Variables — Frontend

| Variable | Required | Description |
|---|---|---|
| `REACT_APP_BACKEND_URL` | ✅ | Backend API base URL |

---

## API Reference

All endpoints are prefixed with `/api`. Full interactive documentation is available at `/docs` (Swagger UI) and `/redoc` (ReDoc) when the backend is running.

### Authentication
| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/auth/login` | Login and receive JWT token |
| `GET` | `/api/auth/me` | Get current user profile |
| `POST` | `/api/auth/logout` | Logout (client-side token invalidation) |

### Environmental
| Method | Endpoint | Description |
|---|---|---|
| `GET/POST` | `/api/environmental/factors` | List or create emission factors |
| `PUT/DELETE` | `/api/environmental/factors/{id}` | Update or delete an emission factor |
| `GET/POST` | `/api/environmental/transactions` | List or log carbon transactions |
| `GET` | `/api/environmental/anomalies` | Detect statistical outliers in transactions |
| `GET/POST` | `/api/environmental/goals` | List or create sustainability goals |
| `GET` | `/api/environmental/scope-breakdown` | Scope 1/2/3 pie chart data |
| `GET/POST/PUT/DELETE` | `/api/environmental/products` | Product ESG profile CRUD |

### Social
| Method | Endpoint | Description |
|---|---|---|
| `GET/POST` | `/api/social/csr` | List or create CSR activities |
| `PATCH` | `/api/social/csr/{id}/status` | Update CSR activity status |
| `GET/POST` | `/api/social/participations` | List or create employee participations |
| `PATCH` | `/api/social/participations/{id}/status` | Approve or reject a participation |
| `GET` | `/api/social/diversity` | Diversity metrics data |

### Governance
| Method | Endpoint | Description |
|---|---|---|
| `GET/POST/PUT/DELETE` | `/api/governance/policies` | Policy CRUD |
| `POST` | `/api/governance/policies/{id}/acknowledge` | Acknowledge a policy |
| `POST` | `/api/governance/policies/{id}/remind` | Send acknowledgement reminders |
| `GET/POST` | `/api/governance/audits` | List or create audits |
| `PATCH` | `/api/governance/audits/{id}/status` | Advance audit status |
| `GET/POST` | `/api/governance/issues` | List or create compliance issues |
| `PATCH` | `/api/governance/issues/{id}/status` | Advance issue status |

### Gamification
| Method | Endpoint | Description |
|---|---|---|
| `GET/POST` | `/api/gamification/challenges` | List or create challenges |
| `PATCH` | `/api/gamification/challenges/{id}/status` | Advance challenge lifecycle |
| `POST` | `/api/gamification/challenges/{id}/join` | Join a challenge |
| `GET/POST` | `/api/gamification/participations` | List or submit challenge participations |
| `PATCH` | `/api/gamification/participations/{id}/approve` | Approve participation and award XP |
| `GET` | `/api/gamification/badges` | List all badges |
| `GET` | `/api/gamification/rewards` | List rewards catalogue |
| `POST` | `/api/gamification/rewards/{id}/redeem` | Redeem a reward |
| `GET` | `/api/gamification/leaderboard` | Employee leaderboard |

### AI Advisor
| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/ai/advisor` | ESG Q&A with live platform context |
| `POST` | `/api/ai/carbon-forecast` | 3-month carbon emission forecast |
| `POST` | `/api/ai/compliance-check` | Governance risk assessment |
| `POST` | `/api/ai/report` | Generate structured ESG report |

### Dashboard & Reports
| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/dashboard/overview` | Overall ESG KPIs |
| `GET` | `/api/dashboard/departments` | Department scores and rankings |
| `GET` | `/api/dashboard/carbon-trend` | Monthly carbon trend data |
| `GET` | `/api/dashboard/predictions` | 3-month ESG score projections |
| `GET` | `/api/dashboard/smart-nudges` | Personalised action nudges |
| `POST` | `/api/dashboard/simulate-score` | What-if ESG score simulator |
| `GET` | `/api/reports/custom` | Custom module-filtered reports |

---

## Project Structure

```
ecosphere/
├── backend/
│   ├── server.py            # FastAPI app — all routes and business logic
│   ├── models.py            # Pydantic request/response models
│   ├── auth.py              # JWT helpers and password hashing
│   ├── seed.py              # Idempotent DB seeder (auto-runs on startup)
│   ├── esg_features.py      # Compliance risk scoring, anomaly detection
│   ├── ai_service.py        # Groq AI integrations
│   ├── Dockerfile           # Backend container image
│   ├── requirements.txt     # Python dependencies
│   ├── .env.example         # Environment variable template
│   └── tests/
│       ├── test_ecosphere_backend.py   # Core backend test suite
│       └── test_new_features.py        # Extended feature tests
├── frontend/
│   ├── public/
│   │   └── index.html       # HTML entry point with SEO meta tags
│   ├── src/
│   │   ├── pages/           # One file per route (Dashboard, Environmental…)
│   │   ├── components/      # Shared Layout, Sidebar, UI primitives
│   │   ├── context/         # AuthContext — JWT management
│   │   ├── lib/
│   │   │   └── api.js       # Axios instance with auth interceptor
│   │   └── index.css        # Global styles + Tailwind utilities
│   ├── Dockerfile           # Multi-stage build → nginx
│   ├── nginx.conf           # SPA routing + gzip + cache headers
│   ├── .env.example         # Frontend environment variable template
│   └── package.json
├── docker-compose.yml       # One-command full-stack deployment
├── .gitignore
└── README.md
```

---

## Deployment

### Option A — Docker Compose (Recommended, One Command)

The fastest way to run the full stack (MongoDB + Backend + Frontend) locally or on any Linux server.

**Prerequisites:** Docker ≥ 24 + Docker Compose ≥ 2

```bash
# 1. Clone the repository
git clone https://github.com/your-org/ecosphere.git
cd ecosphere

# 2. Configure the backend
cp backend/.env.example backend/.env
# Edit backend/.env — set GROQ_API_KEY and JWT_SECRET at minimum

# 3. Start everything
docker compose up --build -d
```

| Service | URL |
|---|---|
| Frontend | http://localhost:3000 |
| Backend API | http://localhost:8001 |
| API Docs (Swagger) | http://localhost:8001/docs |

To stop: `docker compose down`  
To wipe data: `docker compose down -v`

---

### Option B — Render.com (Free Tier Cloud)

#### Backend (Web Service)

1. Go to [render.com](https://render.com) → **New → Web Service**
2. Connect your GitHub repo, select the **`backend/`** root directory
3. Set **Runtime** to `Python 3.11`
4. **Build command:** `pip install -r requirements.txt`
5. **Start command:** `uvicorn server:app --host 0.0.0.0 --port $PORT`
6. Add all environment variables from `backend/.env.example` in the **Environment** tab
7. For `MONGO_URL`, use a [MongoDB Atlas](https://cloud.mongodb.com) free cluster connection string

#### Frontend (Static Site)

1. **New → Static Site** → connect your repo, select **`frontend/`** root
2. **Build command:** `yarn install && yarn build`
3. **Publish directory:** `build`
4. Add environment variable: `REACT_APP_BACKEND_URL=https://your-backend.onrender.com`

---

### Option C — Railway.app

```bash
npm install -g @railway/cli
railway login
railway init

# Deploy backend
cd backend
railway up

# Deploy frontend (separate service)
cd ../frontend
railway up
```

Set `REACT_APP_BACKEND_URL` to your Railway backend URL in the frontend service variables.

---

### Option D — Manual VPS / Linux Server

```bash
# Backend
cd backend
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env   # fill in secrets
uvicorn server:app --host 0.0.0.0 --port 8001 --workers 2

# Frontend (build static files, serve with nginx or any CDN)
cd frontend
npm install && npm run build
# Copy the build/ folder to your nginx document root
```

---

### Running Tests

```bash
# Ensure the backend server is running first (see Getting Started)
cd backend
source venv/Scripts/activate   # Windows: venv\Scripts\activate

# Run all 60 tests
PYTHONPATH=. REACT_APP_BACKEND_URL=http://127.0.0.1:8001 pytest

# With verbose output
PYTHONPATH=. REACT_APP_BACKEND_URL=http://127.0.0.1:8001 pytest -v
```

---

## Hackathon Context

EcoSphere was built as a submission for a sustainability-focused hackathon. It demonstrates:

1. **Full-stack integration** — A Python/FastAPI backend and a React SPA communicate over a clean REST API with JWT auth.
2. **Production-grade features** — Role-based access control, input validation, async database operations, and automated seeding.
3. **AI augmentation** — Groq's LLaMA 3.3 70B is integrated at four touch-points to provide genuine business value beyond simple CRUD.
4. **Behaviour-driven sustainability** — The gamification engine is designed to drive real behaviour change by making sustainability engaging and measurable.
5. **Regulatory alignment** — Scoring and reporting are structured around GRI, SASB, and UN SDG frameworks, making outputs immediately useful for ESG disclosures.

### Running Tests

```bash
# Backend tests (from backend/ with venv activated)
python -m pytest tests/test_ecosphere_backend.py -v

# Extended feature tests
python -m pytest tests/test_new_features.py -v
```

---

## License

This project is licensed under the MIT License. See [LICENSE](LICENSE) for details.

---

<div align="center">

Built with 💚 for a more sustainable future

</div>

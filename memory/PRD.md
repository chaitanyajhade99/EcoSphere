# EcoSphere — ESG Management Platform (PRD)

## Original Problem Statement
Build a production-quality MVP for **EcoSphere**, an enterprise ESG (Environmental, Social, Governance) management platform per the attached PDF spec and Excalidraw UI. Inspired by Microsoft Sustainability Manager, SAP Sustainability Control Tower, Salesforce Net Zero Cloud, IBM Envizi, Notion and Linear. Must be enterprise-grade, hackathon-ready, visually polished, responsive and immediately deployable.

## User Choices (Session 1)
- **AI**: Full AI powered by Emergent LLM key using **Claude Sonnet 4.5** (`claude-sonnet-4-5-20250929`).
- **Auth**: JWT-based custom auth with Admin / Manager / Employee roles.
- **Modules**: All 6 modules with functional depth (Environmental, Social, Governance, Gamification prioritised; Reports, Dashboard fully covered).
- **Seed data**: Yes — realistic multi-department demo data.
- **Design**: Clean enterprise light theme (Linear / Notion / Cabinet Grotesk).

## Architecture
- **Backend**: FastAPI + Motor (MongoDB async) at port 8001. Files:
  - `server.py` — all routes under `/api`
  - `auth.py` — bcrypt password hashing + JWT (7 day) + Bearer / cookie fallback
  - `ai_service.py` — Emergent LLM wrappers (advisor, report, compliance, forecast)
  - `models.py` — Pydantic models
  - `seed.py` — idempotent startup seeding
- **Frontend**: React 19 + Vite (CRA) + TailwindCSS + Recharts + Framer Motion + Sonner
  - Sidebar + topbar layout, 7 pages, Auth context storing JWT in `localStorage`.
- **Storage**: MongoDB `ecosphere_db`.

## User Personas
- **Admin (Aarav Sharma)** — configures ESG weights, seeds data, generates board reports.
- **Manager (Priya Patel)** — approves CSR, monitors dept KPIs, launches challenges.
- **Employee (Rohan Verma)** — joins challenges, earns XP/EcoCoins, acknowledges policies.

## Core Requirements (static)
1. Enterprise ESG dashboard with weighted scoring across E/S/G pillars.
2. Carbon accounting per GHG Protocol (Scope 1/2/3), emission factors, sustainability goals.
3. CSR activity lifecycle with approval workflow + diversity metrics.
4. ESG policies, audits, compliance issue register, acknowledgements.
5. Gamification: challenges, XP, badges, EcoCoins, reward store, leaderboard.
6. AI: Sustainability Advisor (chat), Report Generator, Compliance Checker, Carbon Forecast — each with WHY explanation.
7. Reports with structured executive summary output.
8. Global search across policies / challenges / CSR.

## Implemented ✅ (session 1 – 2026-01)
### Backend
- ✅ Auth: register / login / logout / me / role validation, bcrypt + JWT.
- ✅ Dashboard: overview, departments, activities, notifications, carbon-trend.
- ✅ Environmental: factors, transactions (CRUD w/ auto CO₂e calc), goals, scope breakdown.
- ✅ Social: CSR (create / list / manager approve), diversity metrics.
- ✅ Governance: policies (list / acknowledge), audits, compliance issues.
- ✅ Gamification: challenges (join → XP/coin award), badges, rewards (redeem), leaderboard.
- ✅ Reports: summary + AI generator.
- ✅ AI: advisor chat / report / compliance / forecast (Claude Sonnet 4.5) all with WHY.
- ✅ Search: cross-module.
- ✅ Seed: 5 users, 6 depts, 10 emission factors, 48 carbon txs, 5 goals, 6 CSR, 6 diversity, 6 policies, 5 audits, 5 issues, 5 challenges, 6 badges, 6 rewards, notifications, activities.

### Frontend
- ✅ Login (with quick-demo accounts) + Register.
- ✅ Sidebar + topbar layout with XP / EcoCoin / streak pills + global search.
- ✅ Dashboard with semi-circle ESG gauge, KPI cards, bar/line/area charts.
- ✅ Environmental with scope pie, 6-month area trend, goals with progress bars, transactions table, add-emission modal, AI Forecast card.
- ✅ Social with diversity bar chart, CSR cards, manager approval UI, new-CSR modal.
- ✅ Governance with policies, audits, issues + AI Compliance Checker.
- ✅ Gamification with player card, level progress ring, challenges, badges, rewards store, leaderboard.
- ✅ Reports with AI generator + structured render + JSON export.
- ✅ AI Advisor chat with session persistence and suggestions.

## Testing
- **40/40 backend pytest tests pass** covering auth, dashboard, environmental, social, governance, gamification, reports, AI, and search (file: `/app/backend/tests/test_ecosphere_backend.py`).
- Frontend visual navigation flows verified through Playwright (login → dashboard → gamification).
- All AI endpoints return structured responses with WHY reasoning validated.

## Prioritised Backlog
### P1 — Depth Improvements
- Real PDF / CSV / Excel export for reports (currently JSON-only).
- Streaming SSE for AI Advisor for token-by-token UX.
- Detailed transaction filters (department, date range, scope).
- Notification bell dropdown w/ read/unread state.

### P2 — Nice-to-have
- Bulk CSV import for emissions.
- Real-time WebSocket for leaderboard updates.
- Dark mode toggle.
- PWA offline mode.
- Custom Report Builder drag-drop UI.
- Department ESG heatmap visualisation.
- QR-code CSR attendance.

## Next Action Items
1. Add file upload for CSR evidence (Cloudinary or local).
2. Implement proper PDF export via reportlab or html-to-pdf service.
3. Add filters & pagination to environmental transactions table.
4. Add unit tests for AI JSON parsing edge cases.

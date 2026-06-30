# SPK Haji — Build Walkthrough

## What Was Built

A complete full-stack **Decision Support System (SPK)** for selecting Hajj Group Leaders (KARU & KAROM) using the **AHP + Profile Matching** algorithm.

---

## Project Structure

```
d:\4. CODING\Skripsi\
├── backend/                          # FastAPI (Python)
│   ├── app/
│   │   ├── api/
│   │   │   ├── routes/
│   │   │   │   ├── auth.py           # POST /register, /login, GET /me
│   │   │   │   ├── data.py           # POST /upload-data
│   │   │   │   └── spk.py            # POST /calculate-spk
│   │   │   └── deps.py               # DB session + JWT auth dependencies
│   │   ├── core/
│   │   │   ├── config.py             # Pydantic BaseSettings (.env)
│   │   │   └── security.py           # JWT + bcrypt password hashing
│   │   ├── models/user.py            # SQLAlchemy User model
│   │   ├── schemas/                  # Pydantic request/response schemas
│   │   ├── services/spk_engine.py    # AHP + Profile Matching algorithm
│   │   ├── db.py                     # SQLAlchemy engine + session
│   │   └── main.py                   # FastAPI app entry point
│   ├── venv/                         # Python virtual environment
│   ├── requirements.txt
│   └── .env                          # DB + JWT configuration
│
└── frontend/                         # React + Vite + Tailwind v4
    ├── src/
    │   ├── components/layout/        # Sidebar, Layout
    │   ├── context/AuthContext.jsx    # Auth state management
    │   ├── pages/
    │   │   ├── LoginPage.jsx         # Login UI
    │   │   ├── RegisterPage.jsx      # Register UI
    │   │   ├── DashboardPage.jsx     # Upload, table, params
    │   │   └── ResultsPage.jsx       # Ranked results
    │   ├── services/api.js           # Axios + JWT interceptors
    │   ├── App.jsx                   # React Router
    │   ├── main.jsx                  # Entry point
    │   └── index.css                 # Dark mode design system
    ├── vite.config.js
    └── package.json
```

---

## How to Start

### Step 1: Create MySQL Database

> [!IMPORTANT]
> You need to create the `spk_haji` database in MySQL **before** starting the backend. Open Laragon → MySQL terminal (or phpMyAdmin) and run:
> ```sql
> CREATE DATABASE spk_haji;
> ```
> If your MySQL has a password, update [.env](file:///d:/4.%20CODING/Skripsi/backend/.env) accordingly.

### Step 2: Start the Backend

```powershell
cd "d:\4. CODING\Skripsi\backend"
.\venv\Scripts\activate
uvicorn app.main:app --reload
```

The API runs at **http://localhost:8000**. Swagger docs at **http://localhost:8000/docs**.

The `users` table is auto-created on first startup.

### Step 3: Start the Frontend

```powershell
cd "d:\4. CODING\Skripsi\frontend"
npm run dev
```

Opens at **http://localhost:5173**.

---

## Features Built

### 1. Authentication
- [LoginPage.jsx](file:///d:/4.%20CODING/Skripsi/frontend/src/pages/LoginPage.jsx) — glassmorphism card, email/password, JWT login
- [RegisterPage.jsx](file:///d:/4.%20CODING/Skripsi/frontend/src/pages/RegisterPage.jsx) — name/email/password registration
- [AuthContext.jsx](file:///d:/4.%20CODING/Skripsi/frontend/src/context/AuthContext.jsx) — JWT stored in localStorage, auto-redirect
- [auth.py](file:///d:/4.%20CODING/Skripsi/backend/app/api/routes/auth.py) — bcrypt password hashing, JWT issuance

### 2. Excel Upload & Data Processing
- [DashboardPage.jsx](file:///d:/4.%20CODING/Skripsi/frontend/src/pages/DashboardPage.jsx):
  - Drag-and-drop file upload with SheetJS parsing
  - Auto-filters to only 7 required columns
  - Injects empty **Kesehatan** column for manual input
  - Editable data table with pagination

### 3. Parameter Configuration
- Two numeric inputs: **Jumlah KARU** and **Jumlah KAROM**
- "Proses Perhitungan SPK" action button with glow animation

### 4. Backend SPK Engine
- [spk_engine.py](file:///d:/4.%20CODING/Skripsi/backend/app/services/spk_engine.py):
  - **AHP**: Pre-defined pairwise comparison matrix → criteria weights
  - **Profile Matching**: Gap analysis → Core Factor (60%) + Secondary Factor (40%)
  - Value mappers for all 6 criteria (age ranges, gender, occupation, education, hajj status, health)
  - Ranked output with KARU/KAROM labels

### 5. Results Display
- [ResultsPage.jsx](file:///d:/4.%20CODING/Skripsi/frontend/src/pages/ResultsPage.jsx):
  - Summary cards (total, KARU count, KAROM count, highest score)
  - Selected candidates highlighted cards
  - Full ranked table with green (KARU) and amber (KAROM) row highlighting
  - KARU/KAROM badges
  - CSV export button
  - Pagination

### 6. Design
- Dark mode by default (`#0f1117` background)
- Indigo-to-purple accent gradient
- Glassmorphism cards with backdrop-blur
- Inter font (Google Fonts)
- Smooth animations (fade-in, slide-in, pulse-glow)
- Custom scrollbar, responsive layout

---

## API Endpoints

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `POST` | `/api/auth/register` | ✗ | Create account |
| `POST` | `/api/auth/login` | ✗ | Get JWT token |
| `GET` | `/api/auth/me` | ✓ | Current user info |
| `POST` | `/api/upload-data` | ✓ | Validate processed data |
| `POST` | `/api/calculate-spk` | ✓ | Run AHP + Profile Matching |

---

## Validation

| Check | Result |
|---|---|
| Frontend build (`npm run build`) | ✅ Success — 1647 modules, 3.6s |
| Backend dependencies installed | ✅ 31 packages |
| Frontend dependencies installed | ✅ 120 packages |

---

## Next Steps

1. **Start Laragon** and create the `spk_haji` database
2. **Calibrate AHP matrix** in [spk_engine.py](file:///d:/4.%20CODING/Skripsi/backend/app/services/spk_engine.py) to match your thesis methodology
3. **Adjust target profile values** and value mapping functions to match your research parameters
4. **Test with real Excel data** from your thesis dataset

<h1 align="center">SwiftDash</h1>
<p align="center">
  <strong>Conversational AI for Instant E-Commerce Business Intelligence</strong>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Python-3.10+-3776AB?logo=python&logoColor=white" alt="Python 3.10+" />
  <img src="https://img.shields.io/badge/FastAPI-0.111-009688?logo=fastapi&logoColor=white" alt="FastAPI" />
  <img src="https://img.shields.io/badge/Next.js-15-000000?logo=next.js&logoColor=white" alt="Next.js 15" />
  <img src="https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Firebase_Auth-FFCA28?logo=firebase&logoColor=black" alt="Firebase Auth" />
  <img src="https://img.shields.io/badge/LLM-Google_Gemini-4285F4?logo=google&logoColor=white" alt="Google Gemini" />
  <img src="https://img.shields.io/badge/Docker_Compose-2496ED?logo=docker&logoColor=white" alt="Docker Compose" />
  <img src="https://img.shields.io/badge/License-MIT-green" alt="License MIT" />
</p>

---

## Overview

SwiftDash turns natural-language questions into interactive dashboards, actionable insights, and exportable reports — in seconds. Designed for e-commerce teams who need instant answers without writing SQL.

Type a question like *"show me top 10 products by revenue this month"* and SwiftDash plans the query, generates safe SQL, validates and repairs it with an LLM, executes it against a real database, and renders the optimal chart — all in one request.

---

## Features

- **Natural-Language → SQL Pipeline** — Agentic 3-step flow: Plan → Generate SQL → Validate/Repair + Execute. No hallucinated rows, no made-up data.
- **9 Interactive Plotly Chart Types** — Auto-recommended based on the query and result shape. Bar, line, pie, scatter, heatmap, and more.
- **Conversational Follow-Ups** — Refine your analysis with natural back-and-forth. The agent remembers context within a session.
- **Data Upload & Fetch** — Upload CSV, JSON, or XLSX files for ad-hoc analysis. Fetch Amazon Best Sellers data via the Amazon API.
- **Multi-Format Export** — Export any dashboard as PDF, JSON, or CSV.
- **Firebase Authentication** — Email/password and Google OAuth. Every session is scoped to the authenticated user.
- **Docker Compose or Local Dev** — Run the full stack with one command, or spin up frontend and backend independently.

---

## Architecture

SwiftDash follows a classic 3-tier architecture:

1. **Frontend** — A Next.js 15 single-page application (React 19, TypeScript, Tailwind CSS). Handles authentication via Firebase JS SDK, sends natural-language queries to the API, and renders Plotly.js charts.
2. **Backend** — A FastAPI REST API (Python 3.10+) that verifies Firebase ID tokens, orchestrates the LLM pipeline, executes generated SQL against a SQLite database, and returns chart-ready data.
3. **LLM Layer** — Google Gemini performs schema-grounded prompting, SQL generation, and safety validation/repair. No proprietary model lock-in — the interface is swappable.

---

## Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | Next.js 15, React 19, TypeScript, Tailwind CSS, Plotly.js, Firebase JS SDK |
| **Backend** | FastAPI, pandas, SQLAlchemy, SQLite, Firebase Admin SDK |
| **LLM** | Google Gemini (schema-grounded prompting + SQL safety validation) |
| **Infrastructure** | Docker Compose, Vercel |

---

## Project Structure

```
swift-dash/
├── frontend/                   # Next.js 15 SPA
│   ├── src/                    # Application source
│   ├── .env.local.example      # Frontend environment template
│   └── Dockerfile
├── backend/                    # FastAPI REST API
│   ├── main.py                 # API entry point & route definitions
│   ├── config.py               # Pydantic settings
│   ├── database.py             # SQLite init, query execution, schema
│   ├── llm_service.py          # Gemini integration (plan, generate, repair)
│   ├── query_parser.py         # SQL validation & sanitization
│   ├── chart_recommender.py    # Chart type auto-selection
│   ├── amazon_service.py       # Amazon Best Sellers data fetch
│   ├── models.py               # Pydantic request/response models
│   ├── tests/                  # pytest suite
│   ├── .env.example            # Backend environment template
│   └── Dockerfile
├── api/                        # Vercel serverless shim
│   ├── index.py
│   └── requirements.txt
├── data/                       # Persistent volume (mounted by Docker)
├── .env.example                # Root environment template
├── docker-compose.yml          # Orchestrates backend + frontend
├── vercel.json                 # Vercel deployment config
└── package.json                # Root workspace for Vercel detection
```

---

## Prerequisites

- **Node.js** 18+ and **Python** 3.10+
- A [Firebase](https://firebase.google.com) project (free tier)
- (Optional) A [Gemini API key](https://aistudio.google.com/app/apikey) for LLM features
- (Optional) [Docker Desktop](https://www.docker.com/products/docker-desktop/) for containerized setup

---

## Quick Start

### Manual Setup

#### 1. Firebase Configuration

1. Go to the [Firebase Console](https://console.firebase.google.com) → Create a project.
2. **Authentication → Sign-in method** — Enable **Email/Password** and **Google**.
3. **Project Settings → Your apps** → Add a **Web app** → Copy the Firebase config object.
4. **Project Settings → Service accounts** → **Generate new private key** → Download the JSON file.

#### 2. Backend

```bash
cd backend

# Create virtual environment
python -m venv .venv
# Windows
.\.venv\Scripts\Activate.ps1
# macOS / Linux
source .venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Configure environment
cp .env.example .env
```

Edit `backend/.env`:

```ini
FIREBASE_SERVICE_ACCOUNT_PATH=./firebase-service-account.json
GEMINI_API_KEY=your-gemini-key-here   # optional
```

Place your downloaded Firebase service account JSON at `backend/firebase-service-account.json`.

Start the server:

```bash
uvicorn main:app --reload --port 8000
```

The API is now available at `http://localhost:8000`. Interactive docs at `http://localhost:8000/docs`.

#### 3. Frontend

```bash
cd frontend
npm install

cp .env.local.example .env.local
```

Edit `frontend/.env.local` with your Firebase web app config:

```ini
NEXT_PUBLIC_FIREBASE_API_KEY=your-api-key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
NEXT_PUBLIC_FIREBASE_APP_ID=your-app-id
NEXT_PUBLIC_API_URL=http://localhost:8000
```

Start the dev server:

```bash
npm run dev
```

Open `http://localhost:3000` in your browser.

---

### Docker Compose (Alternative)

Run the entire stack with a single command:

```bash
# Copy and configure environment variables
cp .env.example .env

# Set required variables in .env:
#   GEMINI_API_KEY, RAPIDAPI_KEY, GOOGLE_CLIENT_ID
#   NEXT_PUBLIC_GOOGLE_CLIENT_ID

# Start all services
docker compose up --build
```

- Frontend: `http://localhost:3000`
- Backend API: `http://localhost:8000`
- API docs: `http://localhost:8000/docs`

---

## Configuration Reference

### Frontend Environment Variables (`frontend/.env.local`)

| Variable | Description |
|---|---|
| `NEXT_PUBLIC_FIREBASE_API_KEY` | Firebase Web App API Key |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | Firebase Auth domain (`<project>.firebaseapp.com`) |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | Firebase Project ID |
| `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` | Firebase Storage bucket |
| `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` | Firebase Sender ID |
| `NEXT_PUBLIC_FIREBASE_APP_ID` | Firebase App ID |
| `NEXT_PUBLIC_API_URL` | Backend API base URL |

### Backend Environment Variables (`backend/.env`)

| Variable | Description |
|---|---|
| `FIREBASE_SERVICE_ACCOUNT_PATH` | Path to Firebase service account JSON |
| `FIREBASE_SERVICE_ACCOUNT_JSON` | Inline service account JSON (for serverless deployment) |
| `GEMINI_API_KEY` | Google Gemini API key (optional) |
| `RAPIDAPI_KEY` | RapidAPI key for Amazon Best Sellers (optional) |
| `CORS_ORIGINS` | Comma-separated allowed CORS origins |

---

## Deployment

### Frontend (Vercel)

1. Push the repository to GitHub.
2. Import the project in [Vercel](https://vercel.com).
3. Set **Root Directory** to `frontend` (or leave blank if using the root `vercel.json`).
4. Configure the `NEXT_PUBLIC_*` environment variables in **Vercel → Settings → Environment Variables**.
5. Deploy.

### Backend

The backend can be deployed to any platform that supports Python ASGI (Railway, Render, Fly.io, Google Cloud Run, etc.).

For serverless platforms, set `FIREBASE_SERVICE_ACCOUNT_JSON` (the entire service account JSON as a single line) instead of `FIREBASE_SERVICE_ACCOUNT_PATH`.

### Firebase Authorised Domains

Add your deployment domains to **Firebase Console → Authentication → Settings → Authorised domains**:

```
localhost
your-app.vercel.app
your-custom-domain.com
```

---

## API Overview

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/query` | Submit a natural-language query and receive chart data + dashboard |
| `POST` | `/upload` | Upload CSV / JSON / XLSX for session-scoped analysis |
| `GET` | `/schema` | Retrieve the current database schema |
| `GET` | `/amazon-bestsellers` | Fetch Amazon Best Sellers data |
| `POST` | `/export` | Export dashboard data as PDF / JSON / CSV |

Full interactive API documentation is available at `/docs` when the backend is running.

---

## Testing

### Backend

```bash
cd backend
pytest
```

The test suite covers query parsing, SQL validation, chart recommendation, database operations, and LLM integration.

### Frontend

```bash
cd frontend
npm run lint
```

---

## License

MIT

# AI Dashboard — Conversational BI for E-Commerce

Turn natural-language questions into interactive dashboards, insights, and exports in seconds.

## Authentication

This project uses **Firebase Authentication** (email/password + Google OAuth).

## Stack

- **Frontend**: Next.js 15, React 19, TypeScript, Tailwind CSS, Firebase JS SDK
- **Backend**: FastAPI + pandas + SQLite, Firebase Admin SDK (JWT verification)
- **LLM**: Google Gemini (schema-grounded prompting + SQL safety validation)
- **Infra**: Local run or Docker Compose

---

## Quick Start

### Prerequisites
- Node.js 18+, Python 3.10+
- A Firebase project (free at https://firebase.google.com)
- Optional: GEMINI_API_KEY

### 1. Firebase Setup

1. Go to https://console.firebase.google.com → Create project
2. **Authentication → Sign-in method** → Enable **Email/Password** and **Google**
3. **Project Settings → Your apps** → Add a **Web app** → Copy the config
4. **Project Settings → Service accounts** → Generate new private key → Download JSON

### 2. Backend

```bash
cd backend
python -m venv .venv
source .venv/bin/activate  # Windows: .\.venv\Scripts\Activate.ps1
pip install -r requirements.txt

# Create backend/.env
cat > .env << 'ENVEOF'
FIREBASE_SERVICE_ACCOUNT_PATH=./firebase-service-account.json
GEMINI_API_KEY=your-gemini-key   # optional
ENVEOF

# Copy your downloaded service account JSON to backend/
cp ~/Downloads/your-project-firebase-adminsdk.json ./firebase-service-account.json

uvicorn main:app --reload --port 8000
```

### 3. Frontend

```bash
cd frontend
npm install

cat > .env.local << 'ENVEOF'
NEXT_PUBLIC_FIREBASE_API_KEY=your-api-key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
NEXT_PUBLIC_FIREBASE_APP_ID=your-app-id
NEXT_PUBLIC_API_URL=http://localhost:8000
ENVEOF

npm run dev
```

---

## Deploying to Vercel

### Frontend env vars (Vercel → Settings → Environment Variables)

| Key | Value |
|-----|-------|
| `NEXT_PUBLIC_FIREBASE_API_KEY` | from Firebase web app config |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | from Firebase web app config |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | from Firebase web app config |
| `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` | from Firebase web app config |
| `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` | from Firebase web app config |
| `NEXT_PUBLIC_FIREBASE_APP_ID` | from Firebase web app config |
| `NEXT_PUBLIC_API_URL` | your backend URL |

### Backend env vars (wherever backend is hosted)

| Key | Value |
|-----|-------|
| `FIREBASE_SERVICE_ACCOUNT_JSON` | paste entire service account JSON as one line |
| `GEMINI_API_KEY` | optional |

---

## Firebase Console — Authorised Domains

Go to **Firebase → Authentication → Settings → Authorised domains** and add:
- `localhost`
- `your-app.vercel.app`

---

## Features

- SQLite-backed SQL execution (no hallucinated result rows)
- Agentic 3-step pipeline: Plan → Generate SQL → Validate/Repair + Execute
- 9 interactive Plotly chart types
- Conversational follow-up questions
- CSV, JSON, XLSX upload + Amazon best-seller data fetch
- PDF, JSON, CSV export

## License

MIT

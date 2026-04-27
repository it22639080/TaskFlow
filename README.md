# TaskFlow — AI-Powered Task Management System

> A full-stack task management application with AI-powered prioritization and smart deadline email reminders.

**Live Demo:** https://task-flow-assessment.vercel.app

---

## Features

- **Authentication** — Register/Login with JWT (HttpOnly cookies) + refresh token rotation
- **Task Management** — Full CRUD with priority, status, due dates, subtasks
- **🤖 AI Prioritization** — Groq API (llama-3.3-70b) auto-suggests priority, time estimate & subtasks
- **📧 Deadline Alerts** — Hourly cron sends email reminders for tasks due within 24 hours
- **Route Protection** — Middleware guards dashboard; tokens auto-refresh
- **Security** — Rate limiting, bcrypt, Zod validation, no stack trace leaks

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 14 (App Router) + TypeScript |
| Backend | Express.js + TypeScript |
| Database | MongoDB Atlas + Mongoose |
| Auth | JWT (HttpOnly cookies) + bcrypt |
| AI | Groq API — llama-3.3-70b-versatile (Free) |
| Email | Nodemailer + Gmail App Password (Free) |
| Rate Limiting | In-memory Map (zero dependencies) |
| Validation | Zod |
| Frontend Deploy | Vercel |
| Backend Deploy | Render |

---

## Project Structure

```
taskflow/
├── backend/                    # Express.js API
│   ├── src/
│   │   ├── index.ts            # App entry point
│   │   ├── models/
│   │   │   ├── User.ts         # Mongoose User model
│   │   │   ├── Task.ts         # Mongoose Task + Subtask model
│   │   │   └── RefreshToken.ts # Refresh token model (revocation)
│   │   ├── routes/
│   │   │   ├── auth.ts         # /api/auth/* endpoints
│   │   │   ├── tasks.ts        # /api/tasks/* endpoints
│   │   │   └── ai.ts           # /api/ai/suggest endpoint
│   │   ├── middleware/
│   │   │   └── auth.ts         # JWT authentication middleware
│   │   └── lib/
│   │       ├── db.ts           # MongoDB connection
│   │       ├── jwt.ts          # Sign/verify tokens
│   │       ├── ratelimit.ts    # In-memory rate limiter
│   │       ├── email.ts        # Nodemailer + email template
│   │       └── cron.ts         # Hourly reminder cron job
│   ├── .env.example
│   ├── tsconfig.json
│   └── package.json
│
└── frontend/                   # Next.js App
    ├── app/
    │   ├── layout.tsx
    │   ├── page.tsx            # Redirects to /dashboard or /auth/login
    │   ├── auth/
    │   │   ├── login/page.tsx
    │   │   └── register/page.tsx
    │   └── dashboard/page.tsx  # Protected task dashboard
    ├── src/
    │   ├── middleware.ts        # Route protection
    │   ├── lib/api.ts           # Fetch wrapper with credentials
    │   ├── types/index.ts       # Shared TypeScript interfaces
    │   ├── hooks/
    │   │   ├── useAuth.ts       # Auth state management
    │   │   └── useTasks.ts      # Task CRUD + AI suggest hooks
    │   └── components/
    │       ├── tasks/
    │       │   ├── TaskCard.tsx # Task display with status toggle
    │       │   └── TaskForm.tsx # Create/edit form with AI suggest
    │       └── auth/
    ├── .env.local.example
    └── package.json
```

---

## Local Setup

### Prerequisites
- Node.js 18+
- A Gmail account (for email reminders)
- Free accounts at: [MongoDB Atlas](https://mongodb.com/cloud/atlas) and [Groq](https://console.groq.com)

---

### 1. Clone the Repository

```bash
git clone https://github.com/it22639080/TaskFlow.git
cd taskflow
```

---

### 2. Backend Setup

```bash
cd backend
npm install
cp .env.example .env
```

Fill in `backend/.env`:

```env
MONGODB_URI="mongodb+srv://username:password@cluster0.xxxxx.mongodb.net/taskflow?retryWrites=true&w=majority&appName=Cluster0"
JWT_ACCESS_SECRET=""        # node -e "console.log(require('crypto').randomBytes(64).toString('base64'))"
JWT_REFRESH_SECRET=""       # run again for a different value
JWT_ACCESS_EXPIRES_IN="15m"
JWT_REFRESH_EXPIRES_IN="7d"
GROQ_API_KEY=""             # from console.groq.com → API Keys
GMAIL_USER=""               # your Gmail address
GMAIL_APP_PASSWORD=""       # 16-char App Password from myaccount.google.com
FRONTEND_URL="http://localhost:3000"
PORT=5000
NODE_ENV="development"
```

**Generate JWT secrets (run twice for two different values):**
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('base64'))"
```

**Gmail App Password setup:**
1. Go to [myaccount.google.com](https://myaccount.google.com)
2. Security → Enable 2-Step Verification
3. Search "App Passwords" → App name: `taskflow` → Generate
4. Copy the 16-character password into `GMAIL_APP_PASSWORD`

**Start backend:**
```bash
npm run dev
```
Should output:
```
✅ MongoDB connected
✅ Backend running on http://localhost:5000
✅ Cron jobs started
```

**Verify backend:**
```
GET http://localhost:5000/api/health → { "status": "ok" }
```

---

### 3. Frontend Setup

```bash
cd ../frontend
npm install
cp .env.local.example .env.local
```

Fill in `frontend/.env.local`:
```env
NEXT_PUBLIC_API_URL=http://localhost:5000
```

**Start frontend:**
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

---

## API Documentation

### Auth Endpoints

| Method | Endpoint | Body | Auth Required |
|---|---|---|---|
| POST | `/api/auth/register` | `{ name, email, password }` | No |
| POST | `/api/auth/login` | `{ email, password }` | No |
| POST | `/api/auth/refresh` | — | Refresh cookie |
| DELETE | `/api/auth/logout` | — | No |
| GET | `/api/auth/me` | — | Yes |

**Password rules:** min 8 chars, 1 uppercase letter, 1 number

**Example — Register:**
```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"John Doe","email":"john@example.com","password":"Password1"}'
```

---

### Task Endpoints

All task endpoints require authentication (access_token cookie).

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/tasks` | Get all tasks for authenticated user |
| POST | `/api/tasks` | Create a new task |
| PUT | `/api/tasks/:id` | Update task (owner only) |
| DELETE | `/api/tasks/:id` | Delete task (owner only) |

**Task body:**
```json
{
  "title": "Build login page",
  "description": "Implement JWT auth with HttpOnly cookies",
  "priority": "HIGH",
  "status": "TODO",
  "dueDate": "2026-05-01T00:00:00.000Z",
  "estimatedTime": "3 hours",
  "subtasks": ["Design the UI", "Write API calls", "Add validation"]
}
```

**Priority values:** `LOW` | `MEDIUM` | `HIGH`

**Status values:** `TODO` | `IN_PROGRESS` | `DONE`

---

### AI Suggest Endpoint ✨

| Method | Endpoint | Rate Limit |
|---|---|---|
| POST | `/api/ai/suggest` | 3 requests/minute per user |

**Request:**
```json
{ "title": "Build payment integration", "description": "Stripe checkout flow" }
```

**Response:**
```json
{
  "suggestion": {
    "priority": "HIGH",
    "estimatedTime": "4 hours",
    "reasoning": "Payment integrations are complex and often blocking for product releases.",
    "subtasks": [
      "Set up Stripe account and API keys",
      "Implement checkout session creation",
      "Handle webhook events",
      "Test with Stripe test cards",
      "Deploy and verify in production"
    ]
  }
}
```

---

## Deployment

### Backend — Render (Free)

1. Push `backend/` to GitHub
2. Go to [render.com](https://render.com) → **New Web Service**
3. Connect your GitHub repo
4. Settings:
   - **Root Directory:** `backend`
   - **Build Command:** `npm install && npm run build`
   - **Start Command:** `npm start`
   - **Environment:** Node
5. Add all environment variables from `.env.example` in the Render dashboard
6. Change `FRONTEND_URL` to your Vercel URL
7. Deploy

Your backend URL will be: `https://your-app.onrender.com`

> **Note:** Render free tier spins down after 15min of inactivity. First request after sleep takes ~30s.

---

### Frontend — Vercel (Free)

1. Push `frontend/` to GitHub
2. Go to [vercel.com](https://vercel.com) → **New Project**
3. Import your repo
4. Settings:
   - **Root Directory:** `frontend`
   - **Framework:** Next.js (auto-detected)
5. Add environment variable:
   - `NEXT_PUBLIC_API_URL` = your Render backend URL (e.g. `https://your-app.onrender.com`)
6. Deploy

Live URL: https://task-flow-assessment.vercel.app

---

## Security Architecture

| Security Measure | Implementation |
|---|---|
| Password hashing | bcrypt with 12 salt rounds |
| Token storage | HttpOnly + Secure + SameSite=Strict cookies |
| Token revocation | Refresh tokens stored in MongoDB; deleted on logout |
| Brute force protection | In-memory rate limiting (10 req/min on auth, 3/min on AI) |
| Input validation | Zod schemas on every API route |
| Authorization | Ownership check `task.userId === req.user.userId` on every mutation |
| Error handling | Generic messages only; no stack traces in responses |
| NoSQL injection | Mongoose ODM; no raw query construction |
| CORS | Restricted to `FRONTEND_URL`; credentials enabled |
| AI prompt injection | Input sanitized (strip `<>{}[]`) before sending to Groq |
| Secret management | All keys in `.env`; `.env.example` in repo; `.env` gitignored |

---

## Environment Variables Reference

### Backend (`backend/.env`)

| Variable | Description | Required |
|---|---|---|
| `MONGODB_URI` | MongoDB Atlas connection string | Yes |
| `JWT_ACCESS_SECRET` | Secret for signing access tokens (min 64 chars) | Yes |
| `JWT_REFRESH_SECRET` | Secret for signing refresh tokens (different from access) | Yes |
| `JWT_ACCESS_EXPIRES_IN` | Access token expiry (default: `15m`) | Yes |
| `JWT_REFRESH_EXPIRES_IN` | Refresh token expiry (default: `7d`) | Yes |
| `GROQ_API_KEY` | Groq API key from console.groq.com | Yes |
| `GMAIL_USER` | Gmail address for sending reminders | Yes |
| `GMAIL_APP_PASSWORD` | Gmail App Password (not your login password) | Yes |
| `FRONTEND_URL` | Frontend URL for CORS (e.g. https://yourapp.vercel.app) | Yes |
| `PORT` | Server port (default: `5000`) | No |
| `NODE_ENV` | `development` or `production` | Yes |

### Frontend (`frontend/.env.local`)

| Variable | Description | Required |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | Backend API URL (e.g. https://your-app.onrender.com) | Yes |

---

## Known Trade-offs & Scaling Notes

**In-memory rate limiting** — Works for single-instance deployments. In a multi-instance production environment, this should be replaced with Redis (e.g. Upstash) to share state across instances. This was a deliberate trade-off to keep the stack 100% free.

**Render free tier cold starts** — The backend spins down after 15 minutes of inactivity. The first request after sleep takes ~30 seconds. Upgrade to a paid instance for always-on behavior.

**Gmail SMTP limits** — Gmail limits to ~500 emails/day. For production scale, replace with Resend, SendGrid, or AWS SES.

**MongoDB M0 free tier** — 512MB storage, shared cluster. Suitable for demo and light production. Upgrade to M10+ for dedicated resources.

---

## Git Commit Convention

```
feat: add AI task prioritization via Groq API
fix: correct timezone handling in cron reminder job
security: add rate limiting to auth endpoints
refactor: extract email template to separate function
docs: update README with deployment steps
```

---



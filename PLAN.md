# PLAN.md – TaskFlow Task Management System

## Backend Choice: Express.js

**Justification:** Express.js was selected for its lightweight, unopinionated nature that gives full control over middleware, routing, and request handling. For a task management API with custom auth flows, rate limiting, and third-party integrations (Groq AI, Nodemailer), Express provides maximum flexibility without the overhead of NestJS's module system. It also has the largest ecosystem of middleware, making security hardening straightforward.

**Why not NestJS or Next.js API?**
- **NestJS** adds significant boilerplate (decorators, modules, providers) that is unnecessary at this scale. Its opinionated structure suits large enterprise teams, not lean REST APIs.
- **Next.js API Routes** would couple frontend and backend into one deployment, reducing separation of concerns and making the backend harder to scale or reuse independently.
- **Better alternative considered:** tRPC + Next.js would provide end-to-end type safety with zero API layer friction, but adds learning curve and is overkill for a CRUD-heavy app with straightforward REST semantics.

---

## Architecture Overview

```
┌─────────────────────┐        ┌──────────────────────────────────────┐
│   Next.js Frontend  │        │        Express.js Backend (Render)   │
│   (Vercel)          │◄──────►│                                      │
│                     │  REST  │  ┌──────────┐  ┌──────────────────┐  │
│  /auth/login        │  + JWT │  │  Routes  │  │   Middleware     │  │
│  /auth/register     │ Cookie │  │ /auth    │  │  - CORS          │  │
│  /dashboard         │        │  │ /tasks   │  │  - cookieParser  │  │
│                     │        │  │ /ai      │  │  - authenticate  │  │
└─────────────────────┘        │  └────┬─────┘  │  - rateLimit     │  │
                                │       │        └──────────────────┘  │
                                │  ┌────▼─────────────────────────┐    │
                                │  │         Services              │    │
                                │  │  authService  taskService     │    │
                                │  │  aiService    emailService    │    │
                                │  └────┬─────────────────────────┘    │
                                └───────┼──────────────────────────────┘
                                        │
                   ┌────────────────────┼──────────────────────┐
                   │                    │                       │
          ┌────────▼──────┐   ┌─────────▼──────┐   ┌──────────▼─────┐
          │  MongoDB Atlas │   │   Groq API     │   │  Gmail SMTP    │
          │  (Free M0)     │   │  llama-3.3-70b │   │  (Nodemailer)  │
          └───────────────┘   └────────────────┘   └────────────────┘
```

**Data flow:** Client → Next.js → Express API → Mongoose → MongoDB Atlas → Response

**Cron Job:** `node-cron` runs hourly inside Express, queries tasks due within 24 hours, sends styled HTML emails via Gmail SMTP, marks `reminderSent: true` to prevent duplicates.

---

## Security Considerations

| Layer | Risk | Mitigation |
|---|---|---|
| Auth | Brute force login | In-memory rate limiting (10 req/min per IP) |
| Auth | Weak password storage | bcrypt hashing (12 salt rounds) |
| Auth | Token theft via XSS | JWT in HttpOnly + SameSite=Strict cookies, never localStorage |
| Auth | CSRF attacks | SameSite=Strict cookie + CORS restricted to frontend URL |
| Auth | Token reuse after logout | Refresh tokens stored in MongoDB; deleted on logout |
| API | Unauthorized task access | JWT middleware + `task.userId === req.user.userId` check on every mutation |
| API | NoSQL injection | Mongoose ODM with typed schemas; no raw query strings |
| API | Stored XSS | Zod strips/validates input; React escapes output by default |
| API | Stack trace leaks | Generic error messages in all catch blocks; no `err.stack` in responses |
| AI | Prompt injection | Input stripped of `<>{}[]` before sending to Groq |
| AI | Cost/abuse | Per-user rate limit on AI endpoint (3 req/min) |
| Secrets | Key exposure | All secrets via `.env`; `.env.example` committed; `.env` in `.gitignore` |

---

## Novelty Features

**1. AI Task Prioritization (Groq API — Free)**
On task creation, `llama-3.3-70b-versatile` analyzes the title and description, returning suggested priority (HIGH/MEDIUM/LOW), estimated duration, a one-sentence reasoning, and 3–5 actionable subtasks. User can accept or override all suggestions. Rate-limited to 3 req/min per user to prevent abuse.

**2. Smart Deadline Email Alerts (Nodemailer + Gmail — Free)**
A `node-cron` job runs every hour inside Express, queries MongoDB for tasks due within 24 hours where `reminderSent: false` and `status ≠ DONE`, sends a branded HTML email via Gmail SMTP, then sets `reminderSent: true`. This closes the loop — the app is useful even when the user isn't logged in.

---

## Tech Stack Summary

| Concern | Choice | Reason |
|---|---|---|
| Backend | Express.js + TypeScript | Lightweight, full control, vast middleware ecosystem |
| Frontend | Next.js 14 (App Router) | SSR, file-based routing, Vercel-native deployment |
| Database | MongoDB Atlas + Mongoose | Free M0 tier, flexible document schema, fast queries |
| Auth | JWT (HttpOnly cookies) + Refresh tokens | Stateless, XSS-safe, revocable |
| AI | Groq API (llama-3.3-70b-versatile) | Free tier, extremely fast inference |
| Email | Nodemailer + Gmail App Password | Fully free, no third-party email service needed |
| Validation | Zod | Runtime schema validation shared across routes |
| Rate Limiting | In-memory Map | Zero dependencies; trade-off noted (single instance only) |
| Deployment | Vercel (FE) + Render (BE) | Both free tiers; GitHub CI/CD integration |

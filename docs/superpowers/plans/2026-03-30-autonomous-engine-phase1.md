# Phase 1: Kanban Web Deployment — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deploy the Gallegos Kanban app to Render with authenticated API endpoints, so both the Chief of Staff and OpenClaw agents can access it from anywhere.

**Architecture:** The existing Express + React monorepo deploys as two Render services: a Web Service for the API and a Static Site for the frontend. MongoDB moves from local Docker to MongoDB Atlas (free tier). Auth is hardened with rate limiting, service accounts get long-lived tokens, and a dedicated "Engine" board is created for OpenClaw.

**Tech Stack:** Express 4, Mongoose 8, MongoDB Atlas, Render, Vite, express-rate-limit, Vitest

**Spec:** `docs/superpowers/specs/2026-03-30-autonomous-engine-design.md` — Section "Kanban Web Deployment"

---

## File Structure

### New Files
- `apps/api/src/middleware/rateLimit.ts` — Rate limiting middleware
- `apps/api/src/routes/service-accounts.ts` — Service account creation endpoint (admin-only)
- `apps/api/src/__tests__/rateLimit.test.ts` — Rate limit tests
- `apps/api/src/__tests__/serviceAccounts.test.ts` — Service account tests
- `render.yaml` — Render infrastructure-as-code (API service + static site)

### Modified Files
- `apps/api/src/lib/jwt.ts` — Support configurable token expiry for service accounts
- `apps/api/src/models/User.ts` — Add `isServiceAccount` and `tokenExpiresIn` fields
- `apps/api/src/routes/auth.ts` — Use per-user token expiry when signing
- `apps/api/src/app.ts` — Add rate limiting middleware, update CORS config
- `apps/api/src/index.ts` — No changes needed (already reads PORT from env)
- `apps/api/package.json` — Add express-rate-limit dependency
- `apps/api/.env.example` — Add Atlas connection string example, CORS origins
- `apps/web/.env.example` — Add production API URL example

---

### Task 1: Initialize Git Repo for Kanban

The kanban project directory exists but has no `.git` — it needs to be a git repo for Render deployment.

**Files:**
- Modify: `C:/Users/derri/OneDrive/Documents/Software_Projects/gallegos-kanban/` (init repo)

- [ ] **Step 1: Initialize git repo**

```bash
cd C:/Users/derri/OneDrive/Documents/Software_Projects/gallegos-kanban
git init
```

- [ ] **Step 2: Verify .gitignore exists and covers secrets**

Read `.gitignore` and ensure it includes:
```
node_modules/
.env
dist/
```

If `.gitignore` is missing or incomplete, create/update it.

- [ ] **Step 3: Stage and commit everything**

```bash
git add -A
git commit -m "chore: initial commit — kanban monorepo with Express API and React frontend"
```

- [ ] **Step 4: Create a GitHub remote and push**

```bash
gh repo create gallegos-labs/gallegos-kanban --private --source=. --push
```

---

### Task 2: Add Rate Limiting Middleware

**Files:**
- Create: `apps/api/src/middleware/rateLimit.ts`
- Create: `apps/api/src/__tests__/rateLimit.test.ts`
- Modify: `apps/api/src/app.ts`
- Modify: `apps/api/package.json`

- [ ] **Step 1: Install express-rate-limit**

```bash
cd C:/Users/derri/OneDrive/Documents/Software_Projects/gallegos-kanban
npm install express-rate-limit -w apps/api
```

- [ ] **Step 2: Write the failing test**

Create `apps/api/src/__tests__/rateLimit.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { app } from '../app';

describe('Rate Limiting', () => {
  it('returns 429 after exceeding auth rate limit', async () => {
    const requests = [];
    // Auth limit is 20 per 15 minutes — send 21
    for (let i = 0; i <= 20; i++) {
      requests.push(
        request(app)
          .post('/api/auth/login')
          .send({ email: 'test@test.com', password: 'wrong' })
      );
    }
    const responses = await Promise.all(requests);
    const tooMany = responses.filter(r => r.status === 429);
    expect(tooMany.length).toBeGreaterThan(0);
  });

  it('returns 429 after exceeding general rate limit', async () => {
    const requests = [];
    // General limit is 100 per 15 minutes — send 101
    for (let i = 0; i <= 100; i++) {
      requests.push(request(app).get('/api/health'));
    }
    const responses = await Promise.all(requests);
    const tooMany = responses.filter(r => r.status === 429);
    expect(tooMany.length).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

```bash
cd C:/Users/derri/OneDrive/Documents/Software_Projects/gallegos-kanban
npm run test -w apps/api
```

Expected: FAIL — no rate limiting in place, all requests return 200 or 401.

- [ ] **Step 4: Implement rate limiting middleware**

Create `apps/api/src/middleware/rateLimit.ts`:

```typescript
import rateLimit from 'express-rate-limit';

export const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'TOO_MANY_REQUESTS', message: 'Too many requests, please try again later' },
});

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'TOO_MANY_REQUESTS', message: 'Too many auth attempts, please try again later' },
});
```

- [ ] **Step 5: Wire rate limiters into app.ts**

In `apps/api/src/app.ts`, add after the JSON body parser:

```typescript
import { generalLimiter, authLimiter } from './middleware/rateLimit';

// After express.json()
app.use('/api/', generalLimiter);
app.use('/api/auth', authLimiter);
```

- [ ] **Step 6: Run tests to verify they pass**

```bash
npm run test -w apps/api
```

Expected: All rate limit tests PASS.

- [ ] **Step 7: Commit**

```bash
cd C:/Users/derri/OneDrive/Documents/Software_Projects/gallegos-kanban
git add apps/api/src/middleware/rateLimit.ts apps/api/src/__tests__/rateLimit.test.ts apps/api/src/app.ts apps/api/package.json package-lock.json
git commit -m "feat: add rate limiting — 100 req/15min general, 20 req/15min auth"
```

---

### Task 3: Add Service Account Support

Service accounts are users with `isServiceAccount: true` and configurable token expiry (default 90 days instead of 7 days). Only existing authenticated users can create service accounts (acts as admin gate).

**Files:**
- Modify: `apps/api/src/models/User.ts`
- Modify: `apps/api/src/lib/jwt.ts`
- Modify: `apps/api/src/routes/auth.ts`
- Create: `apps/api/src/routes/service-accounts.ts`
- Create: `apps/api/src/__tests__/serviceAccounts.test.ts`
- Modify: `apps/api/src/app.ts`

- [ ] **Step 1: Write the failing test**

Create `apps/api/src/__tests__/serviceAccounts.test.ts`:

```typescript
import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { app } from '../app';

describe('Service Accounts', () => {
  let adminToken: string;

  beforeAll(async () => {
    // Register a regular user to act as admin
    const res = await request(app)
      .post('/api/auth/register')
      .send({ email: 'admin@test.com', password: 'password123' });
    adminToken = res.body.token;
  });

  it('creates a service account with long-lived token', async () => {
    const res = await request(app)
      .post('/api/service-accounts')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        email: 'openclaw-mac@gallegos-labs.local',
        password: 'SecurePassword123',
      });

    expect(res.status).toBe(201);
    expect(res.body.user.isServiceAccount).toBe(true);
    expect(res.body.token).toBeDefined();
  });

  it('rejects unauthenticated service account creation', async () => {
    const res = await request(app)
      .post('/api/service-accounts')
      .send({
        email: 'bad-actor@test.com',
        password: 'password123',
      });

    expect(res.status).toBe(401);
  });

  it('service account token has 90d expiry', async () => {
    const res = await request(app)
      .post('/api/service-accounts')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        email: 'test-bot@gallegos-labs.local',
        password: 'SecurePassword123',
      });

    const token = res.body.token;
    // Decode JWT payload (base64) to check exp
    const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
    const expiresInDays = (payload.exp - payload.iat) / (60 * 60 * 24);
    expect(expiresInDays).toBe(90);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npm run test -w apps/api
```

Expected: FAIL — `/api/service-accounts` route doesn't exist.

- [ ] **Step 3: Add isServiceAccount field to User model**

In `apps/api/src/models/User.ts`, add to the schema:

```typescript
isServiceAccount: { type: Boolean, default: false },
tokenExpiresIn: { type: String, default: '7d' },
```

- [ ] **Step 4: Update jwt.ts to accept configurable expiry**

In `apps/api/src/lib/jwt.ts`, change `signToken`:

```typescript
export function signToken(payload: { userId: string; email: string }, expiresIn: string = JWT_EXPIRES_IN): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn });
}
```

- [ ] **Step 5: Update auth.ts login to use per-user expiry**

In `apps/api/src/routes/auth.ts`, in the login handler, after fetching the user:

```typescript
const token = signToken(
  { userId: user._id.toString(), email: user.email },
  user.tokenExpiresIn || '7d'
);
```

- [ ] **Step 6: Create service accounts route**

Create `apps/api/src/routes/service-accounts.ts`:

```typescript
import { Router } from 'express';
import { z } from 'zod';
import { User } from '../models/User';
import { hashPassword } from '../lib/hash';
import { signToken } from '../lib/jwt';
import { authMiddleware } from '../middleware/auth';
import { AppError, ErrorCode } from '../lib/errors';

const router = Router();

const createSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

router.post('/', authMiddleware, async (req, res, next) => {
  try {
    const { email, password } = createSchema.parse(req.body);

    const existing = await User.findOne({ email });
    if (existing) {
      throw new AppError(ErrorCode.INVALID_INPUT, 'Email already registered');
    }

    const passwordHash = await hashPassword(password);
    const user = await User.create({
      email,
      passwordHash,
      isServiceAccount: true,
      tokenExpiresIn: '90d',
    });

    const token = signToken(
      { userId: user._id.toString(), email: user.email },
      '90d'
    );

    res.status(201).json({
      user: { id: user._id, email: user.email, isServiceAccount: true },
      token,
    });
  } catch (error) {
    next(error);
  }
});

export default router;
```

- [ ] **Step 7: Register route in app.ts**

In `apps/api/src/app.ts`:

```typescript
import serviceAccountRoutes from './routes/service-accounts';

// After other route registrations
app.use('/api/service-accounts', serviceAccountRoutes);
```

- [ ] **Step 8: Run tests to verify they pass**

```bash
npm run test -w apps/api
```

Expected: All service account tests PASS.

- [ ] **Step 9: Commit**

```bash
cd C:/Users/derri/OneDrive/Documents/Software_Projects/gallegos-kanban
git add apps/api/src/models/User.ts apps/api/src/lib/jwt.ts apps/api/src/routes/auth.ts apps/api/src/routes/service-accounts.ts apps/api/src/__tests__/serviceAccounts.test.ts apps/api/src/app.ts
git commit -m "feat: add service account support — long-lived tokens (90d) for bot agents"
```

---

### Task 4: Update CORS and Environment Config for Production

**Files:**
- Modify: `apps/api/src/app.ts`
- Modify: `apps/api/.env.example`
- Modify: `apps/web/.env.example`

- [ ] **Step 1: Update CORS to support multiple origins**

In `apps/api/src/app.ts`, replace the CORS setup:

```typescript
const allowedOrigins = (process.env.CORS_ORIGINS || 'http://localhost:5173')
  .split(',')
  .map(o => o.trim());

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (curl, service accounts, etc.)
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
}));
```

- [ ] **Step 2: Update .env.example files**

`apps/api/.env.example`:

```bash
# MongoDB — use Atlas connection string for production
MONGODB_URI=mongodb://kanban:kanban123@localhost:27017/kanban?authSource=kanban

# JWT Secret — MUST change in production
JWT_SECRET=dev-secret-key-change-in-production-abc123

# Server port
PORT=3001

# CORS — comma-separated origins
CORS_ORIGINS=http://localhost:5173

# Frontend URL (legacy, replaced by CORS_ORIGINS)
FRONTEND_URL=http://localhost:5173
```

`apps/web/.env.example`:

```bash
# API URL — use Render URL for production
VITE_API_URL=http://localhost:3001
```

- [ ] **Step 3: Run existing tests to ensure nothing broke**

```bash
npm run test -w apps/api
```

Expected: All tests PASS.

- [ ] **Step 4: Commit**

```bash
cd C:/Users/derri/OneDrive/Documents/Software_Projects/gallegos-kanban
git add apps/api/src/app.ts apps/api/.env.example apps/web/.env.example
git commit -m "feat: multi-origin CORS support and production env config"
```

---

### Task 5: Add Render Deployment Config

**Files:**
- Create: `render.yaml`

- [ ] **Step 1: Create render.yaml**

Create `render.yaml` in the kanban project root:

```yaml
services:
  - type: web
    name: gallegos-kanban-api
    runtime: node
    region: oregon
    plan: free
    buildCommand: npm install && npm run build -w apps/api
    startCommand: npm run start -w apps/api
    envVars:
      - key: NODE_ENV
        value: production
      - key: MONGODB_URI
        sync: false  # Set manually in Render dashboard
      - key: JWT_SECRET
        generateValue: true
      - key: PORT
        value: 3001
      - key: CORS_ORIGINS
        sync: false  # Set after static site deploys

  - type: web
    name: gallegos-kanban-web
    runtime: static
    buildCommand: npm install && npm run build -w apps/web
    staticPublishPath: apps/web/dist
    envVars:
      - key: VITE_API_URL
        sync: false  # Set to API service URL after deploy
    routes:
      - type: rewrite
        source: /*
        destination: /index.html
```

- [ ] **Step 2: Commit**

```bash
cd C:/Users/derri/OneDrive/Documents/Software_Projects/gallegos-kanban
git add render.yaml
git commit -m "chore: add Render deployment config — API web service + static frontend"
```

---

### Task 6: Set Up MongoDB Atlas and Deploy

This task is manual (Render dashboard + Atlas dashboard), but documented step-by-step.

- [ ] **Step 1: Create MongoDB Atlas cluster**

1. Go to [MongoDB Atlas](https://cloud.mongodb.com)
2. Create a free M0 cluster (AWS, us-east-1)
3. Create database user: `kanban-prod` with a strong generated password
4. Whitelist IP: `0.0.0.0/0` (allow all — Render IPs are dynamic)
5. Get the connection string: `mongodb+srv://kanban-prod:<password>@<cluster>.mongodb.net/kanban?retryWrites=true&w=majority`

- [ ] **Step 2: Deploy to Render**

1. Go to [Render Dashboard](https://dashboard.render.com)
2. New > Blueprint > Connect the `gallegos-labs/gallegos-kanban` GitHub repo
3. Render reads `render.yaml` and creates both services
4. Set environment variables in the API service:
   - `MONGODB_URI` = Atlas connection string from step 1
   - `CORS_ORIGINS` = the static site URL Render assigns (e.g., `https://gallegos-kanban-web.onrender.com`)
5. Set environment variables in the Web service:
   - `VITE_API_URL` = the API service URL Render assigns (e.g., `https://gallegos-kanban-api.onrender.com`)
6. Trigger deploy

- [ ] **Step 3: Verify health endpoint**

```bash
curl -s https://gallegos-kanban-api.onrender.com/api/health
```

Expected: 200 OK

- [ ] **Step 4: Create service accounts on production**

First, register yourself as the admin user:

```bash
curl -s -X POST https://gallegos-kanban-api.onrender.com/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"derri@gallegos-labs.com","password":"<your-password>"}'
```

Then create service accounts:

```bash
# Get admin token
ADMIN_TOKEN=$(curl -s -X POST https://gallegos-kanban-api.onrender.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"derri@gallegos-labs.com","password":"<your-password>"}' | jq -r '.token')

# Create staff-bot account
curl -s -X POST https://gallegos-kanban-api.onrender.com/api/service-accounts \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"email":"staff-bot@gallegos-labs.local","password":"<generate-secure-password>"}'

# Create openclaw-mac account
curl -s -X POST https://gallegos-kanban-api.onrender.com/api/service-accounts \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"email":"openclaw-mac@gallegos-labs.local","password":"<generate-secure-password>"}'
```

Save all tokens and passwords securely.

- [ ] **Step 5: Commit updated .env for agent-staff**

Update `.env` in the agent-staff repo with the production kanban URL and new token:

```bash
KANBAN_BOT_EMAIL=staff-bot@gallegos-labs.local
KANBAN_BOT_TOKEN=<new-production-token>
KANBAN_BOT_PASSWORD=<password>
KANBAN_API_URL=https://gallegos-kanban-api.onrender.com
```

---

### Task 7: Create Engine Board and Update Manifest

**Files:**
- Modify: `C:/Users/derri/OneDrive/Documents/Software_Projects/gallegos-labs-agent-staff/staff-projects.yaml`

- [ ] **Step 1: Create Engine board on production kanban**

```bash
TOKEN="<staff-bot-production-token>"
API="https://gallegos-kanban-api.onrender.com"

curl -s -X POST "$API/api/projects" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"Autonomous Engine"}'
```

Save the returned project ID.

- [ ] **Step 2: Add Review column to Engine board**

```bash
# Fetch board to get column positions
curl -s "$API/api/projects/<engine-project-id>/board" \
  -H "Authorization: Bearer $TOKEN"

# Add Review column at position 3
curl -s -X POST "$API/api/columns" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"projectId":"<engine-project-id>","title":"Review","position":3}'
```

- [ ] **Step 3: Update staff-projects.yaml**

Add the production kanban URL and the new Engine project:

```yaml
kanban:
  api_url: "https://gallegos-kanban-api.onrender.com"
  local_api_url: "http://localhost:3002"
  default_columns: [Backlog, To Do, In Progress, Review, Done]

projects:
  # ... existing projects ...

  autonomous-engine:
    name: Autonomous Engine
    path: .
    description: "Self-building autonomous software engine — OpenClaw pipeline skills and orchestration"
    status: active
    priority: high
    stack: [OpenClaw, Claude Code Skills, Playwright MCP]
    current_focus: "Phase 1 — Kanban web deployment"
    kanban_board: "Autonomous Engine"
```

- [ ] **Step 4: Verify Chief of Staff can read the remote board**

```bash
curl -s "$API/api/projects/<engine-project-id>/board" \
  -H "Authorization: Bearer $TOKEN"
```

Expected: Board with 5 columns (Backlog, To Do, In Progress, Review, Done), no cards yet.

- [ ] **Step 5: Commit manifest changes**

```bash
cd C:/Users/derri/OneDrive/Documents/Software_Projects/gallegos-labs-agent-staff
git add staff-projects.yaml
git commit -m "feat: add production kanban URL and Autonomous Engine project to manifest"
```

---

### Task 8: Seed Engine Board with All Phase Cards

Create kanban cards for all 5 phases of the autonomous engine build. This gives the full backlog visibility.

- [ ] **Step 1: Create Phase 1 cards (should already be Done by this point)**

```bash
TOKEN="<staff-bot-production-token>"
API="https://gallegos-kanban-api.onrender.com"
PROJECT_ID="<engine-project-id>"
DONE_COL="<done-column-id>"

# Move Phase 1 card to Done since we just completed it
curl -s -X POST "$API/api/cards" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "projectId": "'$PROJECT_ID'",
    "columnId": "'$DONE_COL'",
    "title": "Phase 1: Deploy kanban to Render with auth",
    "description": "## Task\nDeploy kanban to Render with authenticated API endpoints, rate limiting, service accounts, and dedicated Engine board.\n\n## Status\nComplete."
  }'
```

- [ ] **Step 2: Create Phase 2 cards in To Do**

```bash
TODO_COL="<todo-column-id>"

curl -s -X POST "$API/api/cards" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "projectId": "'$PROJECT_ID'",
    "columnId": "'$TODO_COL'",
    "title": "Write skills/staff/openclaw.md — Staff-to-OpenClaw bridge skill",
    "description": "## Task\nCreate the Chief of Staff sub-skill that wraps OpenClaw Gateway API communication.\n\nMessage types: work:assign, work:pause, work:resume, config:update, status:request, review:approved, review:rejected.\n\nMust handle connection errors gracefully and report to President if OpenClaw is unreachable."
  }'

curl -s -X POST "$API/api/cards" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "projectId": "'$PROJECT_ID'",
    "columnId": "'$TODO_COL'",
    "title": "Define queue-schema.md — message queue protocol",
    "description": "## Task\nDefine the queue.md format used for OpenClaw-to-Staff async messaging.\n\nFormat: timestamped entries with type, card reference, branch, test results, demo link, summary.\n\nBoth sides must speak this format. Include examples for each message type: review:ready, blocked, status:report, error, question."
  }'

curl -s -X POST "$API/api/cards" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "projectId": "'$PROJECT_ID'",
    "columnId": "'$TODO_COL'",
    "title": "Test Staff-to-OpenClaw messaging (status:request round-trip)",
    "description": "## Task\nEnd-to-end test: Chief of Staff sends a status:request to OpenClaw Gateway API and receives a response.\n\nRequires OpenClaw running on the Mac with the gateway enabled."
  }'

curl -s -X POST "$API/api/cards" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "projectId": "'$PROJECT_ID'",
    "columnId": "'$TODO_COL'",
    "title": "Test OpenClaw-to-Staff queue.md fallback",
    "description": "## Task\nTest the fallback path: OpenClaw writes to queue.md when Staff is offline, Staff reads and clears it on next startup.\n\nVerify format matches queue-schema.md."
  }'
```

- [ ] **Step 3: Create Phase 3 cards in Backlog**

```bash
BACKLOG_COL="<backlog-column-id>"

curl -s -X POST "$API/api/cards" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "projectId": "'$PROJECT_ID'",
    "columnId": "'$BACKLOG_COL'",
    "title": "Write OpenClaw pipeline.md — main autonomous loop skill",
    "description": "## Task\nThe core pipeline skill OpenClaw follows: poll board, pull card, plan, implement, test, demo, move to review.\n\nIncludes review queue cap (max 3), error handling, blocked card handling."
  }'

curl -s -X POST "$API/api/cards" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "projectId": "'$PROJECT_ID'",
    "columnId": "'$BACKLOG_COL'",
    "title": "Write OpenClaw planning.md — implementation planning skill",
    "description": "## Task\nSkill that teaches OpenClaw how to read a kanban card and produce a markdown implementation plan.\n\nPlan saved to docs/plans/YYYY-MM-DD-<slug>.md in the target repo."
  }'

curl -s -X POST "$API/api/cards" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "projectId": "'$PROJECT_ID'",
    "columnId": "'$BACKLOG_COL'",
    "title": "Write OpenClaw testing.md — Playwright MCP test skill",
    "description": "## Task\nSkill for functional testing and visual regression testing via Playwright MCP.\n\nCovers: starting dev server, writing E2E tests, running them, capturing screenshots for visual baselines, reporting results."
  }'

curl -s -X POST "$API/api/cards" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "projectId": "'$PROJECT_ID'",
    "columnId": "'$BACKLOG_COL'",
    "title": "Write OpenClaw demo.md — video demo recording skill",
    "description": "## Task\nSkill for recording short demo videos of completed features using Playwright MCP.\n\nNavigates happy path, records video, saves artifact, links in kanban card."
  }'

curl -s -X POST "$API/api/cards" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "projectId": "'$PROJECT_ID'",
    "columnId": "'$BACKLOG_COL'",
    "title": "Write OpenClaw queue.md — message queue skill",
    "description": "## Task\nSkill that teaches OpenClaw how to write to and read from the queue.md file.\n\nFollows queue-schema.md format. Handles append, read-all, clear operations."
  }'

curl -s -X POST "$API/api/cards" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "projectId": "'$PROJECT_ID'",
    "columnId": "'$BACKLOG_COL'",
    "title": "Install and configure Playwright MCP on OpenClaw Mac",
    "description": "## Task\nFirst card the engine builds for itself.\n\nInstall @anthropic-ai/mcp-playwright into OpenClaw MCP config on the Mac.\nVerify it can launch a browser, navigate, take screenshots, and record video."
  }'

curl -s -X POST "$API/api/cards" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "projectId": "'$PROJECT_ID'",
    "columnId": "'$BACKLOG_COL'",
    "title": "Deploy pipeline skills to Mac and validate end-to-end",
    "description": "## Task\nCopy all OpenClaw skills to the Mac. Run the pipeline manually on one test card to validate the full cycle: pull card, plan, implement, test, demo, move to review."
  }'
```

- [ ] **Step 4: Create Phase 4 cards in Backlog**

```bash
curl -s -X POST "$API/api/cards" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "projectId": "'$PROJECT_ID'",
    "columnId": "'$BACKLOG_COL'",
    "title": "Configure OpenClaw cron for autonomous board polling",
    "description": "## Task\nSet up OpenClaw cron job to run the pipeline loop every 5-10 minutes.\n\nIncludes review queue cap check (max 3 in Review), idle logging, and error recovery."
  }'

curl -s -X POST "$API/api/cards" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "projectId": "'$PROJECT_ID'",
    "columnId": "'$BACKLOG_COL'",
    "title": "Add queue pull to /staff startup — read Mac queue on boot",
    "description": "## Task\nUpdate the /staff briefing flow to pull queue.md from OpenClaw Mac on startup.\n\nSend status:request to Gateway API, process any queued messages, present in briefing, clear queue."
  }'

curl -s -X POST "$API/api/cards" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "projectId": "'$PROJECT_ID'",
    "columnId": "'$BACKLOG_COL'",
    "title": "Full autonomous cycle test — observe one card end-to-end",
    "description": "## Task\nWith cron running, place a real card in To Do and observe the engine work through the full pipeline autonomously.\n\nVerify: card moves through columns, plan is written, tests run, demo recorded, review notification queued."
  }'
```

- [ ] **Step 5: Commit**

No code changes — board seeding only. Nothing to commit.

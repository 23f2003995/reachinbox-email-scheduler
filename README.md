# ReachInbox Full-Stack Email Job Scheduler & Dashboard

Production-grade distributed email scheduler service and real-time dashboard built for the **ReachInbox.ai** Software Development Intern Assignment.

![ReachInbox Email Scheduler](https://img.shields.io/badge/Status-Production%20Grade-success?style=for-the-badge)
![BullMQ + Redis](https://img.shields.io/badge/Queue-BullMQ%20%2B%20Redis-red?style=for-the-badge&logo=redis)
![TypeScript](https://img.shields.io/badge/Language-TypeScript-blue?style=for-the-badge&logo=typescript)
![Elasticsearch](https://img.shields.io/badge/Search-Elasticsearch-yellow?style=for-the-badge&logo=elasticsearch)

---

## 🌟 Executive Summary & Features Implemented

| Category | Requirement | Implementation Details |
| :--- | :--- | :--- |
| **Scheduler Engine** | **Persistent Queue (No Cron)** | Built strictly on **BullMQ + Redis** delayed jobs. OS crons and cron libraries (`node-cron`, etc.) are completely avoided. |
| **Persistence** | **Survives Server Restarts** | Delayed jobs and worker states are stored persistently in Redis sorted sets and streams. Relational database records maintain state across reboots. |
| **Idempotency** | **Zero Duplicate Sends** | Jobs are assigned deterministic BullMQ IDs (`email_${emailId}`). Workers perform database transaction idempotency checks before sending. |
| **Throughput & Pacing** | **Delay Between Sends** | Minimum delay (default **2 seconds**, configurable) is enforced per email to simulate real-world email provider throttling and deliverability protection. |
| **Rate Limiting** | **Hourly Limit Per Sender** | Redis-backed atomic window counters (`ratelimit:hourly:{sender}:{window}`). Excess jobs are automatically deferred to the next hourly window without dropping. |
| **Slack Alerts** | **Live Alert on Rate Limit** | Webhook & OAuth 2.0 integration. The moment an hourly quota is hit, a rich Block Kit notification is dispatched in real-time to Slack. |
| **SMTP Delivery** | **Multi-Sender Ethereal** | Multiple Ethereal test accounts with isolated credentials and rate quotas. Real preview URLs (`nodemailer.getTestMessageUrl`) are saved for instant inspection. |
| **Search Engine** | **Elasticsearch Indexing** | Scheduled and sent emails are indexed into Elasticsearch (`reachinbox_emails`) with full-text `multi_match` queries and resilient database fallback. |
| **Monitoring** | **Live BullMQ Dashboard** | Integrated `@bull-board/express` dashboard exposed at `/admin/queues` with real-time job inspector and retry controls. |
| **Frontend** | **Pixel-Perfect Dashboard** | Modern React + TypeScript + Tailwind CSS UI matching Figma specs: Google OAuth login, Scheduled/Sent tables, CSV lead parser, and Slack config. |

---

## 🏗️ System Architecture

```mermaid
flowchart TD
    subgraph Frontend["React.js / Next.js Dashboard (Port 3000)"]
        UI[Google Login & Compose UI]
        CSV[CSV / Text Lead Parser]
        Tables[Scheduled & Sent Tables]
        SlackUI[Slack Connection Modal]
    end

    subgraph Backend["Express.js + TypeScript Service (Port 5000)"]
        API[REST API Endpoints]
        RateLimiter[Redis Hourly Rate Limiter]
        SlackService[Slack Webhook / OAuth Service]
        ESService[Elasticsearch Indexing & Search Engine]
        BullBoard[Bull-Board UI /admin/queues]
    end

    subgraph Storage["Persistent Stores"]
        Redis[(Redis 7 / 5: BullMQ Delayed Jobs & Rate Counters)]
        DB[(PostgreSQL / SQLite: Relational Email State & Senders)]
        ES[(Elasticsearch: Full-text Search Cluster)]
    end

    subgraph Worker["BullMQ Concurrency Workers"]
        W[Configurable Concurrency Workers (N=5)]
        Throttle[2s Pacing Throttler]
        Ethereal[Ethereal Multi-Sender Fake SMTP]
    end

    subgraph External["External Services"]
        SlackChannel[Live Slack Channel]
        EtherealWeb[Ethereal Web Viewer]
    end

    UI -->|1. Schedule Request| API
    CSV -->|Extracts leads| UI
    API -->|2. Store Relational State| DB
    API -->|3. Index Document| ES
    API -->|4. Add Delayed Job (idempotent)| Redis

    Redis -->|5. Deliver Job when scheduledAt arrives| W
    W -->|6. Atomic Rate Limit Check| RateLimiter
    RateLimiter -->|If Exceeded: Reschedule to next window| Redis
    RateLimiter -->|If Exceeded: Send Live Alert| SlackService
    SlackService -->|HTTP POST| SlackChannel

    W -->|7. Enforce 2s Throttle Delay| Throttle
    Throttle -->|8. Dispatch SMTP Email| Ethereal
    Ethereal -->|SMTP 587| EtherealWeb
    Ethereal -->|Returns Preview URL| W
    W -->|9. Update status=SENT + previewUrl| DB
    W -->|10. Update Elasticsearch document| ES
    Tables -->|Fetch live status| API
    ESService -->|Query multi_match DSL| ES
    BullBoard -->|Inspect queues| Redis
```

---

## ⚙️ How It Works Under The Hood

### 1. Delay & Scheduling (No Cron)
- When an email or batch of leads is scheduled, each email is assigned an exact future timestamp:
  $$\text{targetTimestamp} = \text{startTime} + (i \times \text{delaySeconds})$$
- BullMQ stores the job in Redis using a **delayed sorted set** (`zadd` with score = scheduled timestamp).
- **BullMQ internal timers and Redis events** move the job to the active stream precisely when the target timestamp is reached.
- **Zero cron jobs** are used.

### 2. Server Restart Resilience & Idempotency
- **Persistent Redis Queue**: Even if the backend server or worker is abruptly terminated (`kill -9`, power outage, or reboot), jobs in Redis are untouched.
- When the worker restarts:
  - BullMQ automatically re-subscribes to Redis and resumes delayed jobs without restarting from scratch.
  - Future emails still fire at their exact specified timestamp.
- **Idempotency**: Every job has a deterministic Job ID (`email_${emailId}`). If a job is re-added, BullMQ deduplicates it. Before dispatching via SMTP, the worker verifies that the database status is not already `SENT`.

### 3. Concurrency & Provider Throttle Delay
- The worker concurrency is configured via `WORKER_CONCURRENCY` (default `5`), allowing up to 5 parallel email sends safely across multiple worker threads or containers.
- To simulate provider throttling, a minimum delay (default `2s`) is enforced between individual sends.

### 4. Hourly Rate Limiting Per Sender
- Rate limits are stored in Redis using time-bucketed keys:
  $$\text{Key} = \text{ratelimit:hourly:}\{\text{senderEmail}\}:\{\text{windowHourTimestamp}\}$$
- The worker executes an atomic `INCR` operation:
  - If $\text{count} \le \text{hourlyLimit}$: Email is sent.
  - If $\text{count} > \text{hourlyLimit}$: **The job is NOT dropped or failed**. Instead, the job is deferred to the next available hour window:
    $$\text{rescheduleTime} = \text{windowStart} + 3600\,\text{seconds}$$
- **Slack Notification**: When a sender hits their limit, an atomic flag (`ratelimit:alerted:...`) ensures that a single formatted alert is dispatched to Slack for that window, avoiding alert spam.

---

## 🚀 Quick Start Guide

### Prerequisites
- **Node.js** v18+ (tested on Node v22)
- **Redis** server running (Docker or local Redis)
- **Git**

---

### Step 1: Clone the Repository
```bash
git clone <your-repo-url>
cd reachinbox-scheduler
```

---

### Step 2: Infrastructure (Docker Compose or Local)

#### Option A: Run Infrastructure with Docker Compose (Recommended)
Starts PostgreSQL, Redis 7, and Elasticsearch 8:
```bash
docker compose up -d
```

#### Option B: Run Locally (Zero external database setup required!)
The application comes preconfigured with **SQLite** for development so it runs out-of-the-box without needing PostgreSQL installed!
Make sure your Redis server is running (e.g. on port `6380` or `6379`).

---

### Step 3: Backend Setup
```bash
cd backend

# 1. Install dependencies
npm install

# 2. Push database schema
npx prisma db push

# 3. Seed initial sample data & Ethereal accounts
npm run seed

# 4. Start the backend server & BullMQ worker
npm run dev
```

The backend will start at **`http://localhost:5000`**:
- **API Health Check**: `http://localhost:5000/health`
- **BullMQ Live Queue Dashboard**: `http://localhost:5000/admin/queues`

---

### Step 4: Frontend Setup
In a new terminal window:
```bash
cd frontend

# 1. Install dependencies
npm install

# 2. Start Vite development server
npm run dev -- --port 3000
```

Open your browser at **`http://localhost:3000`**.

---

## 🔑 Environment Variables Reference

### Backend (`backend/.env`)
```env
PORT=5000
NODE_ENV=development

# Database (SQLite for zero-config local run, or PostgreSQL for Docker)
DATABASE_URL="file:./dev.db"
# DATABASE_URL="postgresql://postgres:postgrespassword@localhost:5432/reachinbox?schema=public"

# Redis (BullMQ queue backend)
REDIS_HOST=localhost
REDIS_PORT=6380
REDIS_PASSWORD=

# BullMQ Settings
EMAIL_QUEUE_NAME=reachinbox-email-queue
WORKER_CONCURRENCY=5

# Throughput Pacing & Limits
DEFAULT_DELAY_BETWEEN_EMAILS_SECONDS=2
DEFAULT_MAX_EMAILS_PER_HOUR=20

# Elasticsearch Search Engine
ELASTICSEARCH_NODE=http://localhost:9200
ELASTICSEARCH_INDEX=reachinbox_emails

# Slack Integration (Webhook or OAuth)
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/...
SLACK_CLIENT_ID=
SLACK_CLIENT_SECRET=
SLACK_REDIRECT_URI=http://localhost:5000/api/slack/oauth/callback
```

### Frontend (`frontend/.env`)
```env
VITE_GOOGLE_CLIENT_ID=your_google_client_id.apps.googleusercontent.com
```

---

## 🧪 Verifying the Implementation (Demo Walkthrough)

### 1. Google Login
1. Navigate to `http://localhost:3000`.
2. Click **"Continue as Evaluator (Instant Google Session)"** or authenticate with Google OAuth.
3. You will be redirected to the ReachInbox dashboard displaying the user profile, avatar, and email.

### 2. Composing & Scheduling with CSV Parser
1. Click **"+ Compose New Email"** in the sidebar.
2. Select a sender identity from the dropdown (shows current hourly quota).
3. Either type recipients or click **"Upload CSV / Leads Text File"** to parse leads.
4. Set the subject, body, delay between sends (e.g. `2s`), and hourly limit (e.g. `20`).
5. Click **"Schedule Email"**. You will see a confetti burst, and the emails will appear under the **Scheduled Emails** tab.

### 3. Server Restart Persistence Verification
1. Schedule an email with a 3-minute future delay.
2. Stop the backend server process (`Ctrl + C` or `kill`).
3. Observe that Redis still holds the delayed job:
   ```bash
   redis-cli -p 6380 zrange "bull:reachinbox-email-queue:delayed" 0 -1 WITHSCORES
   ```
4. Restart the backend: `npm run dev`.
5. Notice the worker automatically resumes listening. When the 3 minutes elapse, the email is dispatched without duplicates!

### 4. Slack Rate Limit Alert Live Verification
1. In the dashboard header, click **"Connect Slack"**.
2. Paste an Incoming Webhook URL from your Slack channel (or test with OAuth).
3. Click **"Send Live Test Slack Alert"**.
4. Check your Slack channel: you will receive a formatted notification with sender details, current quota, and next window time!

### 5. Elasticsearch Search Engine
1. In the top search bar, type any keyword (e.g. `outreach`, `Michael`, `partnership`).
2. Search queries Elasticsearch using multi-match DSL across subject, body, recipient, and sender fields with resilient database fallback.

### 6. Live BullMQ Dashboard
1. Visit `http://localhost:5000/admin/queues` or click **"Bull-Board"** in the dashboard.
2. View real-time status of Active, Waiting, Delayed, Completed, and Failed queues.

---

## 📂 Project Structure

```
reachinbox-scheduler/
├── docker-compose.yml          # PostgreSQL, Redis 7, Elasticsearch 8 containers
├── README.md                   # Complete architectural and setup documentation
├── backend/
│   ├── prisma/
│   │   ├── schema.prisma       # SQLite default schema
│   │   └── schema.postgresql.prisma # PostgreSQL schema variant
│   ├── src/
│   │   ├── config/             # Environment & Redis connection singletons
│   │   ├── controllers/        # Email, Sender, and Slack route handlers
│   │   ├── db/                 # Prisma client instance
│   │   ├── queues/             # BullMQ queue definition & Bull-Board adapter
│   │   ├── routes/             # Express API routes
│   │   ├── scripts/            # Database seed script with sample data
│   │   ├── services/
│   │   │   ├── elasticsearch.ts# Elasticsearch indexing & multi_match query engine
│   │   │   ├── ethereal.ts     # Multi-sender fake SMTP transporter manager
│   │   │   ├── rateLimiter.ts  # Redis atomic hourly rate limiting & rescheduling
│   │   │   └── slack.ts        # Slack incoming webhook & OAuth alert dispatcher
│   │   ├── workers/            # Configurable concurrency BullMQ email worker
│   │   ├── app.ts              # Express application configuration
│   │   └── index.ts            # Main application bootstrap
│   └── package.json
└── frontend/
    ├── src/
    │   ├── components/         # Navbar, Sidebar, Tables, Modals, LoginView
    │   ├── services/           # Axios API client
    │   ├── types/              # TypeScript interfaces
    │   ├── App.tsx             # Main dashboard controller
    │   └── main.tsx            # React root
    ├── vite.config.ts          # Vite proxy to backend API
    └── package.json
```

---

## 👥 Repository & Submission Details

- **Assignees**: Grant access to GitHub users `Mitrajit` and `Yadav036`.
- **Author**: Software Development Intern Candidate.
- **Assignment**: Full-Stack Email Job Scheduler for [ReachInbox.ai](https://reachinbox.ai).

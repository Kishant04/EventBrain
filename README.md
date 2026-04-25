# PITCHING VIDEO LINK : https://drive.google.com/file/d/1tcDKon191ttuGTIgh-hze7VuqqrrggU8/view?usp=sharing
# EventBrainAI

**AI-Powered Corporate Event Orchestration Platform**

An intelligent event planning assistant that transforms casual natural-language requests into actionable vendor strategies, risk assessments, and execution plans. Built for the Malaysian market, EventBrainAI combines real-time LLM intelligence with live database queries to deliver complete event logistics in seconds.

---

## Table of Contents

- [Project Overview](#project-overview)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Architecture](#architecture)
- [Project Structure](#project-structure)
- [Agent Pipeline](#agent-pipeline)
- [Setup Instructions](#setup-instructions)
- [Environment Configuration](#environment-configuration)
- [Database Schema](#database-schema)
- [Running the Application](#running-the-application)
- [API Endpoints](#api-endpoints)
- [Socket.IO Events](#socketio-events)
- [Testing](#testing)
- [Key Implementation Details](#key-implementation-details)

---

## Project Overview

### What It Does

EventBrainAI automates corporate event planning by accepting a single natural-language brief and orchestrating a multi-agent workflow:

**Input Example:**
```
"Nak buat team building 80 orang next Friday budget RM4000 outdoor KL"
```

**Output:**
1. Structured event requirements (pax, budget, date, location, event type)
2. Ranked vendor recommendations with pricing and ratings
3. Risk assessment with mitigation strategies
4. Professional vendor inquiry email drafts
5. Three strategic execution paths (conservative, balanced, aggressive)
6. Emergency crisis recovery if a vendor cancels

### Why EventBrainAI

- **Instant Planning**: From request to decision in under 30 seconds
- **Zero Boilerplate**: Accept free-form text in English, Malay, or Manglish
- **Live Streaming**: Watch each agent step execute through the UI in real time
- **Vendor Intelligence**: Query live database without manual lookups
- **Risk Aware**: Assess budget, weather, lead time, and Malaysian holidays
- **Crisis Ready**: One-click emergency replanning if vendors cancel
- **Gemini-Powered**: Leverages Google Gemini 2.5 Flash with intelligent retry/fallback logic

---

## Features

✅ **Multi-Agent Pipeline**: 5 specialized agents (intake, vendor ranking, risk, email drafting, decision)
✅ **Real-time Streaming**: Socket.IO event streaming for live UI updates
✅ **Intelligent Caching**: In-memory SHA-256 cache for identical prompts
✅ **Retry & Backoff**: Exponential backoff with Retry-After header support for Gemini API
✅ **Crisis Fallback**: Deterministic vendor replacement when API quota exhausted
✅ **Concurrent Execution**: Agents 2a/2b run in parallel via asyncio.gather
✅ **Session Persistence**: All outputs logged to Supabase for audit/replay
✅ **Email Refinement**: Interactive tone-based email rewrites
✅ **Malaysian Context**: Holiday detection, peak season awareness, regional event types
✅ **Smart UI**: Auto-scroll chat feed with unread indicators, agent trace panel, execution paths

---

## Tech Stack

### Backend

| Component | Technology |
|-----------|------------|
| **Framework** | FastAPI |
| **Server** | Uvicorn (ASGI) |
| **Real-Time** | python-socketio |
| **LLM** | Google Gemini 2.5 Flash (REST via httpx) |
| **Database** | Supabase (PostgreSQL) |
| **Config** | python-dotenv |
| **Runtime** | Python 3.11+ |

### Frontend

| Component | Technology |
|-----------|------------|
| **Framework** | React 19 |
| **Build** | Vite 8 |
| **Styling** | Tailwind CSS v4 |
| **Real-Time** | socket.io-client |
| **Icons** | Material Symbols (Google Fonts) |
| **Runtime** | Node.js 18+ |

---

## Architecture

```
┌────────────────────────────────────────────────────────────────┐
│                     React Frontend (Vite)                      │
│            Live Chat Feed · Agent Trace · Crisis UI            │
└────────────────────────┬───────────────────────────────────────┘
                         │
        ┌────────────────┴────────────────┐
        │ HTTP POST /api/run              │
        │ Socket.IO (polling/websocket)   │
        │                                 │
┌───────▼─────────────────────────────────▼──────────┐
│            FastAPI + python-socketio ASGI          │
│              Backend Orchestration Layer            │
└───────┬───────────────────────────────────┬────────┘
        │                                   │
    ┌───▼─────────────────────────────────┬─┴──┐
    │          Orchestrator Core          │    │ Crisis
    │  (Session Management + Pipeline)    │    │ Handler
    └───┬─────────┬──────────┬────────┬───┘    │
        │ Agent 1 │ Agent 2a │ Agent  │        │
        │ Intake  │ Vendor   │ 3 Email│        │ Agent 5
        │         │ Ranker   │ Draft  │        │ Crisis
        │         │ (+ 2b    │        │        │ Recovery
        │         │ Risk,    ├────────┤        │
        │         │ parallel)│ Agent 4│        │
        │         │          │ Decision        │
        │         │          │        │        │
        └────────┬┬──────────┴────────┴────────┘
                 │
        ┌────────▼──────────────┐
        │  Gemini REST API      │
        │  (httpx + retry)      │
        └────────┬──────────────┘
                 │
        ┌────────▼──────────────┐
        │  Supabase PostgreSQL  │
        │ vendors, sessions,    │
        │ agent_logs, holidays  │
        └───────────────────────┘
```

---

## Project Structure

```
EventBrainAI/
│
├── backend/
│   ├── main.py                    # FastAPI app, REST endpoints, Socket.IO ASGI mount
│   ├── orchestrator.py            # Pipeline orchestration, agent sequencing, parallelization
│   ├── gemini_client.py           # Gemini REST client, retry, cache, backoff logic
│   ├── db.py                      # Supabase queries (vendors, sessions, logs, holidays)
│   ├── socket_manager.py          # python-socketio server instance
│   ├── requirements.txt
│   ├── .env                       # (not committed) Gemini API key, Supabase, tuning params
│   ├── README.md                  # Backend-specific documentation
│   │
│   └── agents/
│       ├── intake_agent.py        # Agent 1: Parse free-form text → structured event brief
│       ├── vendor_ranker_agent.py # Agent 2a: Query DB, rank top 3 vendors
│       ├── risk_agent.py          # Agent 2b: Assess budget/weather/lead-time risk
│       ├── email_drafter_agent.py # Agent 3: Draft professional vendor inquiry emails
│       ├── decision_agent.py      # Agent 4: Synthesize 3 execution paths
│       └── crisis_agent.py        # Agent 5: Emergency vendor replacement + outreach
│
├── frontend/
│   ├── package.json
│   ├── vite.config.js
│   ├── index.html
│   ├── src/
│   │   ├── main.jsx
│   │   ├── App.jsx                # Root layout, sidebar, topbar, routing (dashboard ↔ history)
│   │   │
│   │   ├── hooks/
│   │   │   └── useSocket.js       # Central Socket.IO state manager, formatters, event handlers
│   │   │
│   │   └── components/
│   │       ├── ChatFeed.jsx       # Live message feed with auto-scroll & unread button
│   │       ├── AgentTracePanel.jsx# Agent status trace (waiting → running → done/failed)
│   │       ├── ExecutionPaths.jsx # Conservative/balanced/aggressive cards with tradeoffs
│   │       ├── CrisisTrigger.jsx  # Crisis trigger button & busy state
│   │       ├── SessionHistory.jsx # Past sessions with drill-down execution logs
│   │       ├── SessionInfo.jsx    # Pipeline status & current event summary
│   │       ├── ChatInput.jsx      # User message input
│   │       └── [other components...]
│
├── testing/
│   ├── test_pipeline.py           # CLI test: runs full pipeline without UI
│   └── test_gemini_hello.py       # CLI test: validates Gemini API connection
│
└── README.md                      # This file
```

---

## Agent Pipeline

The orchestration flow is deterministic and progresses through these stages:

### Stage 1: Parsing (Agent 1)
- **Input**: User's free-form request (Malay/English/Manglish)
- **Processing**: Gemini extracts structured data
- **Output**: `{ pax, budget_rm, budget_per_pax, event_type, location, date_requested, lead_time_days, budget_risk, budget_flag_message, missing_fields }`

### Stage 2: Vendor & Risk Analysis (Agents 2a & 2b, **concurrent**)

**Agent 2a — Vendor Ranker**
- Queries Supabase vendors table with pax/lead-time filters
- If no suitable vendors found, falls back to top 10 by rating
- Uses Gemini to rank top 3 with explanations
- Enriches with contact email and speciality from DB

**Agent 2b — Risk Agent**
- Checks if event date is a Malaysian holiday/peak season
- Uses Gemini to score risk (1–10), identify factors, and suggest mitigations
- Accounts for monsoon season, budget constraints, short lead times

### Stage 3: Vendor Outreach (Agent 3)
- **Input**: Intake results + ranked vendors
- **Output**: 3 professional inquiry emails (one per vendor)
- Includes event date, pax, vendor speciality
- Back-fills delivery email addresses from DB if Gemini didn't capture them

### Stage 4: Decision Strategy (Agent 4)
- **Input**: Intake + vendors + risk + emails
- **Output**: 3 execution paths
  - **Conservative**: Lowest-cost, safest option
  - **Balanced**: Cost/risk equilibrium
  - **Aggressive**: Premium option with more features/guarantees
- Includes per-path cost, risk level, and tradeoffs

### Stage 5: Crisis Recovery (Agent 5, **on-demand**)
- Triggered via `/api/crisis` when a vendor cancels
- Finds replacement vendors (excludes cancelled vendor)
- Drafts urgent outreach emails with "URGENT" subject lines
- Provides revised 2-sentence recovery strategy
- Includes deterministic fallback if Gemini rate-limits (429)

---

## Setup Instructions

### Prerequisites

- **Python 3.11+**
- **Node.js 18+** and **npm**
- **Supabase project** with required tables (see Database Schema)
- **Google Gemini API key** (via ai.google.dev)

### Step 1: Backend Setup

```bash
# Navigate to project root
cd EventBrainAI

# Create Python virtual environment
python -m venv .venv

# Activate environment (Windows PowerShell)
.venv\Scripts\Activate.ps1

# Or (macOS/Linux)
source .venv/bin/activate

# Install backend dependencies
pip install -r backend/requirements.txt
```

### Step 2: Frontend Setup

```bash
# Navigate to frontend folder
cd frontend

# Install frontend dependencies
npm install

# Return to root
cd ..
```

### Step 3: Environment Configuration

Create `backend/.env`:

```env
# Gemini LLM API
GEMINI_API_KEY=your_gemini_api_key_here
GEMINI_MODEL=gemini-2.5-flash
GEMINI_FALLBACK_MODELS=

# Supabase Database
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your_supabase_service_role_or_anon_key

# Pipeline Tuning (optional — defaults shown)
AGENT_TIMEOUT_SECONDS=300
LLM_HTTP_TIMEOUT_SECONDS=90
LLM_MAX_RETRIES=3
LLM_BACKOFF_BASE_SECONDS=1.0
LLM_BACKOFF_MAX_SECONDS=20.0
LLM_TEMPERATURE=0.3
LLM_CACHE_TTL_SECONDS=900
LLM_CACHE_MAX_ITEMS=500
```

Optional `frontend/.env`:

```env
VITE_API_BASE_URL=http://localhost:8000
VITE_SOCKET_TRANSPORT=polling
```

---


## Running the Application

### Terminal 1: Start Backend

```bash
# From project root (with .venv activated)
uvicorn backend.main:app --reload
```

Server runs on `http://localhost:8000`

### Terminal 2: Start Frontend Dev Server

```bash
# From project root
cd frontend
npm run dev
```

UI runs on `http://localhost:5173`

### Build Frontend for Production

```bash
cd frontend
npm run build
# Output: frontend/dist/
```

---


## Socket.IO Events

All events are **server → client**, emitted during pipeline execution.

### `session_started`
```json
{ "session_id": "uuid" }
```
Emitted immediately after session record created.

### `agent_update`
```json
{
  "agent": 1,
  "status": "running",
  "data": null
}
```
or
```json
{
  "agent": 2,
  "status": "done",
  "data": { "ranked_vendors": [...], ... }
}
```

**Status values:**
- `running`: Agent is executing
- `done`: Agent completed successfully
- `failed`: Agent failed (error in data.error field)

**Timeout behavior:** Timeouts are emitted as `status: "failed"` with `data.status: "timeout"`

---

### `pipeline_complete`
```json
{
  "session_id": "uuid",
  "status": "completed",
  "reason": null
}
```

**Status values:**
- `completed`: Pipeline finished successfully
- `failed`: Pipeline failed at some step
- `cancelled`: Pipeline was cancelled via `/api/stop`

---

## Testing

### CLI Test: Full Pipeline (No UI)

```bash
# From project root (with .venv active)
python testing/test_pipeline.py
```

Runs the pipeline with a hardcoded request and prints all Socket.IO events to stdout. Edit line 13 to test different prompts.

### CLI Test: Gemini Connection

```bash
# From project root (with .venv active)
python testing/test_gemini_hello.py
```

Validates Gemini API connectivity and prints response to stdout.

---

## Key Implementation Details

### Gemini Client Features

- **Smart Caching**: SHA-256 keyed in-memory cache for identical (system_prompt, user_message) pairs
- **Retry Logic**: Exponential backoff with jitter (1s base, 20s max) on transient errors (408, 429, 500–504)
- **Retry-After Support**: Parses HTTP `Retry-After` header for rate-limit compliance
- **Fallback Models**: Optional cascade to alternative models if primary `GEMINI_MODEL` unavailable
- **404 Fail-Fast**: Immediately raises if model is not available for your API key
- **Deterministic Crisis Fallback**: If Gemini unavailable during crisis (429), generates hard-coded replacement plan using DB data

### Session & Status Model

Sessions flow through these canonical statuses:

- `processing`: Pipeline running
- `completed`: Pipeline finished successfully
- `failed`: Agent failure or pipeline error
- `cancelled`: User clicked stop
- `crisis`: Crisis recovery started
- `crisis_failed`: Crisis recovery failed
- `crisis_resolved`: Crisis recovery successful

### Concurrency

- **Agents 2a & 2b** run in parallel via `asyncio.gather(vendor_task, risk_task)` to reduce latency
- All other agents are sequential as they depend on prior results
- Full end-to-end execution typically completes in 15–30 seconds

### Frontend State Management

- **useSocket.js** is the central state coordinator
  - Manages real-time socket events
  - Normalizes agent statuses and outputs into UI-ready message types
  - Handles session history and crisis triggers
  - Formats multi-line narratives for chat feed rendering

---

## Support & Troubleshooting

### Common Issues

**"GEMINI_API_KEY is not set"**
- Ensure backend/.env has GEMINI_API_KEY with your valid API key

**"Gemini model is not available"**
- Check GEMINI_MODEL is a model your API key has access to
- Verify no typos in GEMINI_MODEL name

**"Supabase connection failed"**
- Verify SUPABASE_URL and SUPABASE_KEY in backend/.env
- Check network connectivity to Supabase
- Ensure tables exist in your Supabase project

**"Socket.IO connection timeout"**
- If frontend stuck on "Connecting…", check backend is running
- Verify VITE_API_BASE_URL in frontend/.env points to correct backend host
- Try switching VITE_SOCKET_TRANSPORT to `websocket` (if supported by your network)



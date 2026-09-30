# CodeArena - College Coding Contest Platform

> **A production-style full-stack platform with a sandboxed code-execution engine designed for high-concurrency college contests.**

[![CI Pipeline](https://github.com/Rajat45654/CodeArena/actions/workflows/ci.yml/badge.svg)](https://github.com/Rajat45654/CodeArena/actions/workflows/ci.yml)
[![Node.js Version](https://img.shields.io/badge/node-%3E%3D20.0.0-brightgreen.svg)](https://nodejs.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

---

## 1. High-Level Architecture

CodeArena solves one hard engineering problem properly: **accepting arbitrary code from strangers, running it safely with strict sandboxed limits, judging it fairly and deterministically, and pushing live verdicts and ICPC contest standings in real-time under concurrent load.**

```text
                     Browser (Next.js App Router)
                       │         ▲
               REST    │         │  WebSocket (verdicts, leaderboard)
                       ▼         │
                   ┌────────────────┐
                   │     Nginx      │
                   └───────┬────────┘
                           │
                   ┌───────▼────────┐
                   │   NestJS API   │
                   │  (auth, CRUD,  │
                   │  contests, WS) │
                   └──┬────┬────┬───┘
                      │    │    │
         ┌────────────┘    │    └─────────────┐
         ▼                 ▼                  ▼
    PostgreSQL           Redis          (enqueue job)
   (source of truth)  (leaderboard,          │
                       rate limits,          ▼
                       pub/sub)          BullMQ queue
                           ▲                 │
                           │        ┌────────┴─────────┐
                           │        ▼                  ▼
                           │   Judge Worker 1     Judge Worker N
                           │        │                  │
                           │        ▼                  ▼
                           │   Docker sandbox     Docker sandbox
                           │   (compile + run)    (compile + run)
                           │        │                  │
                           └────────┴──────────────────┘
                        write verdict -> Postgres, update leaderboard,
                        publish event -> API -> WebSocket -> Browser
```

---

## 2. Core Engineering Pillars

1. **Hardened Docker Sandbox:**
   - Capped CPU, memory, PIDs (64 max), execution time, and output size (1 MB max).
   - Network disabled (`--network none`), read-only rootfs, unprivileged execution (`10001:10001`), and dropped Linux capabilities (`--cap-drop ALL`).
2. **Reliable Asynchronous Judge Pipeline:**
   - Fast API response (< 200 ms enqueue), BullMQ queue with burst absorption and retry handling.
3. **Idempotent Standings & Recovery:**
   - Standings recomputed from raw submission rows under an advisory transaction lock.
   - Out-of-order worker completions and retried jobs never corrupt ICPC penalties or scores.
   - Redis sorted sets are fully rebuildable from PostgreSQL.
4. **Real-Time Push Architecture:**
   - Worker writes verdict to Postgres, publishes event to Redis Pub/Sub, and NestJS WebSocket gateway relays updates to client rooms.

---

## 3. Monorepo Structure

```text
codearena/
├── apps/
│   ├── web/                  # Next.js 14 frontend (App Router, Tailwind CSS, Monaco)
│   ├── api/                  # NestJS API (REST, Swagger, WebSockets, Prisma)
│   └── worker/               # Judge Worker (BullMQ consumer, Docker runner)
│
├── packages/
│   ├── shared-types/         # Domain enums, DTOs, WebSocket event types
│   ├── validation/           # Shared Zod schemas for runtime validation
│   └── config/               # Shared ESLint, Prettier, and TypeScript configs
│
├── sandbox/
│   ├── images/               # Dockerfiles for C++17, Python 3.11, Java 17 runners
│   └── languages.json        # Compiler commands, run flags, and resource limits
│
├── infra/
│   ├── docker-compose.yml    # Development stack (PostgreSQL 16, Redis 7)
│   ├── docker-compose.prod.yml
│   └── nginx/                # Reverse proxy configuration
│
├── docs/                     # Architecture, Sandbox Security, ADRs, Benchmarks
└── .github/workflows/        # Automated CI workflow
```

---

## 4. Development Quickstart

### Prerequisites
- Node.js `>= 20.0.0`
- Docker Engine & Docker Compose
- npm `>= 10.0.0`

### 1. Clone & Configure
```bash
git clone https://github.com/Rajat45654/CodeArena.git
cd CodeArena
cp .env.example .env
```

### 2. Start Infrastructure
```bash
# Starts PostgreSQL (port 5433) and Redis (port 6380) with health checks
npm run infra:up
```

### 3. Install Dependencies
```bash
npm install
```

### 4. Run Database Migrations
```bash
npm run db:migrate
```

### 5. Launch Services
```bash
# Run all services concurrently (or individually)
npm run dev:api     # NestJS API on http://localhost:4000 (Swagger: /api/docs)
npm run dev:worker  # BullMQ Judge Worker
npm run dev:web     # Next.js Web on http://localhost:3000
```

---

## 5. Development Roadmap

- [x] **Phase 0 - Setup:** Monorepo, Docker Compose, Prisma schema, shared packages, initial scaffolds.
- [ ] **Phase 1 - Auth & Users:** JWT auth (httpOnly cookies), Argon2 password hashing, RBAC.
- [ ] **Phase 2 - Problems & Test Cases:** Problem CRUD, hidden testcases, sample test exposure.
- [ ] **Phase 3 - Sandbox Runner:** Docker image builds, runner isolation, abuse test suite.
- [ ] **Phase 4 - Judge Orchestration:** Compile -> execute -> comparator -> verdict pipeline.
- [ ] **Phase 5 - Queue & Submissions API:** BullMQ queue, guarded idempotent finalization.
- [ ] **Phase 6 - Real-Time Gateway:** WebSockets gateway, Redis pub/sub bridge, polling fallback.
- [ ] **Phase 7 - Frontend Core:** Monaco code editor, submission history, live verdict badge.
- [ ] **Phase 8 - Contest Engine:** ICPC scoring, `ContestProblemResult`, Redis sorted sets, rejudge.
- [ ] **Phase 9 - Hardening & Security:** Rate limiting, backpressure, orphan container janitor.
- [ ] **Phase 10 - Testing & CI/CD:** End-to-end Playwright tests, automated GitHub Actions.
- [ ] **Phase 11 - Benchmarking & Live Contest:** k6 load testing, failure experiments, college contest.

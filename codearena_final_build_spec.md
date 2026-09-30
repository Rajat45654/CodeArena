# CodeArena — College Coding Contest Platform
## Full-Stack SDE Resume Project — Master Build Specification

> **Project type:** Production-style full-stack platform with a sandboxed code-execution engine
> **Goal:** Build a coding contest platform (mini Codeforces / LeetCode) that a real college coding club can run a real contest on.
> **Primary stack:** Next.js + TypeScript + NestJS + PostgreSQL + Redis + BullMQ + WebSockets + Docker
> **Philosophy:** One hard problem (running untrusted code safely and fairly), solved properly, wrapped in a complete full-stack product. Depth over breadth.

---

> **Version:** Final merged specification (combines the base build spec with the engineering-centerpiece, benchmarking/failure-experiment, and positioning additions, plus correctness fixes to finalization and standings).

## How to use this document

- **Why this project is worth building:** Sections 2, 36, 37
- **The core system (spend most of your time here):** Sections 14 (pipeline), 15 (sandbox), 17 (queue), 19-20 (contest + leaderboard)
- **Build order and schedule:** Section 28
- **Proof you must produce (experiments and a real contest):** Section 31
- **Working with an AI agent:** Section 34 (paste the master prompt first)
- **Interview preparation:** Section 35

---

# 1. Executive Summary

CodeArena lets users solve programming problems in the browser. A user writes code in C++, Python or Java, submits it, and receives a verdict within seconds:

```text
Accepted / Wrong Answer / Time Limit Exceeded /
Memory Limit Exceeded / Runtime Error / Compilation Error
```

Admins create problems and timed contests. During a contest, participants see a live leaderboard ranked by ICPC-style scoring (problems solved, then time penalty).

The core engineering challenge:

> Accept arbitrary code from strangers, run it safely with strict limits, judge it fairly and reliably, and push the result back live, even under load and even when workers crash.

Everything else (auth, roles, CRUD, UI) exists to support that pipeline.

---

# 2. Engineering Centerpiece — What Makes CodeArena Resume-Worthy

This project should be presented as an engineering system, not as a LeetCode clone.

The five problems that deserve the majority of implementation and testing effort are:

1. **Secure execution of untrusted code**
   - isolated containers
   - CPU, memory, PID, filesystem, output and wall-clock limits
   - no network access
   - non-root execution
   - cleanup and orphan-container recovery

2. **Reliable asynchronous judging**
   - API returns quickly
   - BullMQ absorbs bursts
   - worker pool performs CPU-heavy judging
   - crashed/stalled jobs can recover
   - user-code failures are distinguished from infrastructure failures

3. **Idempotent state transitions**
   - a submission may be delivered to a worker more than once
   - only one finalization may affect the submission/contest state
   - standings must never be double-counted
   - PostgreSQL remains the source of truth

4. **Fair concurrent contest execution**
   - multiple users can submit simultaneously
   - per-user rate limits prevent queue flooding
   - worker concurrency is bounded
   - contest submissions can be prioritized
   - leaderboard updates remain consistent under concurrent judging

5. **Measured performance**
   - load-test submission bursts
   - measure queue wait time, judge throughput and p50/p95 verdict latency
   - measure WebSocket fan-out
   - test worker failure and recovery
   - run an actual college contest and record real results

## What NOT to optimize for

Do not add features merely to increase the technology list.

Avoid turning the project into:

- a social network
- a full LeetCode clone
- a generic analytics dashboard
- a microservice showcase
- a Kubernetes project
- an AI feature added only for resume keywords

A smaller system with a secure judge, reliable workers, correct contest scoring and measured performance is more valuable than a larger system with shallow features.

---

# 3. Goals and Non-Goals

## 3.1 Goals

- Real users can register, solve problems, and join contests
- Untrusted code runs in a properly isolated sandbox
- Verdicts are correct, deterministic, and never duplicated
- Live verdict updates and live leaderboard
- Reliable under concurrent submissions (queue + worker pool)
- Deployed, load-tested, and actually used in at least one real contest
- Clean, documented, tested codebase

## 3.2 Non-Goals (do NOT build these initially)

- Plagiarism detection
- Custom checkers / interactive problems
- Payments, subscriptions
- Social features (friends, feeds, chat)
- Mobile app
- Microservices (start with a modular monolith + one separate worker process)
- Kubernetes
- Search engines / OpenSearch
- Complex analytics dashboards
- Multi-region deployment

---

# 4. Core Product Principle

Do NOT build:

> "A CRUD app with a code editor."

Build:

> "A judge system that happens to have a web UI."

Every major feature must have:

1. A user problem
2. A backend design
3. A data model
4. Authorization rules
5. Error handling
6. Tests
7. Documentation

Never add a technology unless it solves a concrete problem.

---

# 5. Users and Roles

## 5.1 Guest

- View public problems list and public contests
- Register / log in
- Cannot submit

## 5.2 User (Participant)

- Solve practice problems
- Register for contests
- Submit code
- View own submissions and verdicts
- View leaderboard of contests they can access

## 5.3 Admin

- Everything a user can do
- Create / edit / publish problems
- Upload and manage test cases
- Create / edit contests and attach problems
- View all submissions
- Rejudge a submission
- Ban / disable a user (optional)

---

# 6. Real-World Use Case

The college coding club runs a 2-hour contest with 60 students.

```text
Contest: "Weekly Contest #1"
Duration: 2 hours
Problems: A, B, C, D, E
```

1. Admin creates 5 problems, each with 10-20 hidden test cases
2. Admin creates the contest and attaches problems as A-E
3. Students register before the start time
4. At start time, problems become visible
5. A student writes a C++ solution and hits Submit
6. Submission enters the queue; UI shows `Queued -> Running -> Accepted`
7. Leaderboard updates live for everyone
8. At end time, submissions close; final standings are stored
9. Admin can view stats: submissions per problem, acceptance rate

This is the workflow the platform must support end to end.

---

# 7. Technology Stack

## 7.1 Frontend

- Next.js (App Router) + React + TypeScript
- Tailwind CSS
- TanStack Query (server state)
- React Hook Form + Zod (forms and validation)
- Monaco Editor (code editor)
- Socket.IO client (or native WebSocket client)

## 7.2 Backend API

- NestJS + TypeScript
- REST API with OpenAPI/Swagger docs
- class-validator or Zod for DTO validation
- JWT authentication
- WebSocket gateway (NestJS + Socket.IO)

## 7.3 Database

- PostgreSQL (source of truth)
- Prisma ORM

## 7.4 Redis and Queue

- Redis: rate limiting, leaderboard (sorted sets), Socket.IO adapter / pub-sub, BullMQ backend
- BullMQ: submission judging queue

## 7.5 Judge Worker

- Separate Node.js process (`apps/worker`)
- Talks to Docker Engine (via `dockerode` or the Docker CLI) to run sandboxed containers
- Prebuilt language images (gcc, python, JDK)

## 7.6 Infrastructure

- Docker + Docker Compose
- Nginx (reverse proxy, TLS)
- GitHub Actions (CI/CD)
- Deployment target: a single VPS (any provider) or a small cloud VM. The worker should run on a host where you control Docker.

## 7.7 Testing

- Jest, Supertest (API)
- Playwright (E2E)
- React Testing Library (components)
- k6 (load testing)
- Dedicated sandbox-escape / abuse test suite (see Section 15)

## 7.8 Observability

- Structured JSON logs with request IDs and submission IDs
- Health checks (`/health`, `/ready`)
- Queue metrics (depth, wait time, failure count)
- Optional later: Prometheus + Grafana

---

# 8. High-Level Architecture

```text
                    Browser (Next.js)
                      |         ^
              REST    |         |  WebSocket (verdicts, leaderboard)
                      v         |
                  +----------------+
                  |     Nginx      |
                  +-------+--------+
                          |
                  +-------v--------+
                  |   NestJS API   |
                  |  (auth, CRUD,  |
                  |  contests, WS) |
                  +--+----+----+---+
                     |    |    |
        +------------+    |    +-------------+
        v                 v                  v
   PostgreSQL           Redis          (enqueue job)
  (source of truth)  (leaderboard,          |
                      rate limits,          v
                      pub/sub)          BullMQ queue
                          ^                 |
                          |        +--------+---------+
                          |        v                  v
                          |   Judge Worker 1     Judge Worker N
                          |        |                  |
                          |        v                  v
                          |   Docker sandbox     Docker sandbox
                          |   (compile + run)    (compile + run)
                          |        |                  |
                          +--------+------------------+
                       write verdict -> Postgres, update leaderboard,
                       publish event -> API -> WebSocket -> Browser
```

Key rules:

- PostgreSQL is the source of truth. Redis data must be rebuildable from Postgres.
- The API never executes user code. Only the worker does.
- The worker is the only component with Docker access.
- WebSockets are for delivery only, never for persistence.

---

# 9. Monorepo Structure

```text
codearena/
├── apps/
│   ├── web/                  # Next.js frontend
│   ├── api/                  # NestJS API + WebSocket gateway
│   └── worker/               # Judge worker (BullMQ consumer)
│
├── packages/
│   ├── shared-types/         # Verdict enums, DTO types, event payloads
│   ├── validation/           # Shared Zod schemas
│   └── config/               # ESLint, tsconfig, prettier
│
├── sandbox/
│   ├── images/               # Dockerfiles for cpp / python / java runners
│   └── languages.json        # Language configs (compile/run commands, limits)
│
├── infra/
│   ├── docker-compose.yml
│   ├── docker-compose.prod.yml
│   ├── nginx/
│   └── k6/                   # Load test scripts
│
├── docs/
│   ├── architecture.md
│   ├── sandbox-security.md
│   ├── benchmarks.md         # load-test results (real numbers only)
│   ├── failure-experiments.md # crash / Redis / WebSocket / abuse experiment results
│   ├── adr/                  # Architecture Decision Records
│   └── api.md
│
├── .github/workflows/
└── README.md
```

## 9.1 Backend module layout (NestJS)

```text
apps/api/src/
├── auth/
├── users/
├── problems/
├── testcases/
├── contests/
├── submissions/
├── leaderboard/
├── realtime/            # WebSocket gateway
├── rate-limit/
├── health/
├── common/
│   ├── guards/
│   ├── decorators/
│   ├── filters/
│   ├── interceptors/
│   └── middleware/
└── main.ts
```

Each domain module: controller, service, DTOs, data-access layer, tests. Keep business logic out of controllers.

## 9.2 Worker layout

```text
apps/worker/src/
├── queue/               # BullMQ processor
├── judge/               # orchestration: compile -> run -> compare -> verdict
├── sandbox/             # Docker runner, limits, cleanup
├── compare/             # output comparison logic
├── persistence/         # verdict write + standings update (transactional)
└── main.ts
```

---

# 10. Database Design

## 10.1 Prisma schema (starting point)

```prisma
enum Role {
  USER
  ADMIN
}

enum Language {
  CPP17
  PYTHON3
  JAVA17
}

enum SubmissionStatus {
  QUEUED
  COMPILING
  RUNNING
  ACCEPTED
  WRONG_ANSWER
  TIME_LIMIT_EXCEEDED
  MEMORY_LIMIT_EXCEEDED
  RUNTIME_ERROR
  COMPILATION_ERROR
  INTERNAL_ERROR   // system fault, never counted as a penalty
}

model User {
  id           String   @id @default(uuid())
  email        String   @unique
  username     String   @unique
  passwordHash String
  role         Role     @default(USER)
  isActive     Boolean  @default(true)
  createdAt    DateTime @default(now())

  submissions  Submission[]
  registrations ContestParticipant[]
}

model Problem {
  id            String   @id @default(uuid())
  slug          String   @unique
  title         String
  statementMd   String
  timeLimitMs   Int      @default(2000)
  memoryLimitMb Int      @default(256)
  difficulty    String?
  isPublished   Boolean  @default(false)
  createdById   String
  createdAt     DateTime @default(now())

  testCases     TestCase[]
  contestLinks  ContestProblem[]
  submissions   Submission[]
}

model TestCase {
  id             String  @id @default(uuid())
  problemId      String
  ordinal        Int
  input          String
  expectedOutput String
  isSample       Boolean @default(false)

  problem Problem @relation(fields: [problemId], references: [id], onDelete: Cascade)

  @@unique([problemId, ordinal])
}

model Contest {
  id             String   @id @default(uuid())
  slug           String   @unique
  title          String
  description    String?
  startsAt       DateTime
  endsAt         DateTime
  penaltyMinutes Int      @default(20)
  freezeAt       DateTime?     // optional leaderboard freeze
  isPublic       Boolean  @default(true)
  createdById    String
  createdAt      DateTime @default(now())

  problems       ContestProblem[]
  participants   ContestParticipant[]
  submissions    Submission[]
  results        ContestProblemResult[]

  @@index([startsAt, endsAt])
}

model ContestProblem {
  contestId String
  problemId String
  label     String   // "A", "B", ...
  ordinal   Int

  contest Contest @relation(fields: [contestId], references: [id], onDelete: Cascade)
  problem Problem @relation(fields: [problemId], references: [id])

  @@id([contestId, problemId])
  @@unique([contestId, label])
}

model ContestParticipant {
  contestId    String
  userId       String
  registeredAt DateTime @default(now())

  contest Contest @relation(fields: [contestId], references: [id], onDelete: Cascade)
  user    User    @relation(fields: [userId], references: [id])

  @@id([contestId, userId])
}

model Submission {
  id                String           @id @default(uuid())
  userId            String
  problemId         String
  contestId         String?
  language          Language
  sourceCode        String
  status            SubmissionStatus @default(QUEUED)
  failedTestOrdinal Int?
  timeMs            Int?
  memoryKb          Int?
  compileOutput     String?
  attempts          Int              @default(0)   // judge attempts (retries)
  createdAt         DateTime         @default(now())
  judgedAt          DateTime?

  user    User     @relation(fields: [userId], references: [id])
  problem Problem  @relation(fields: [problemId], references: [id])
  contest Contest? @relation(fields: [contestId], references: [id])
  testResults SubmissionTestResult[]

  @@index([userId, createdAt])
  @@index([contestId, createdAt])
  @@index([problemId, status])
  @@index([status, createdAt])
}

model SubmissionTestResult {
  id           String           @id @default(uuid())
  submissionId String
  testOrdinal  Int
  status       SubmissionStatus
  timeMs       Int?
  memoryKb     Int?

  submission Submission @relation(fields: [submissionId], references: [id], onDelete: Cascade)

  @@unique([submissionId, testOrdinal])
}

// Materialized per-user, per-problem contest state. It is a CACHE OF A
// COMPUTATION over Submission rows: whenever a contest submission reaches a
// final verdict, this row is RECOMPUTED (not incremented) from that user's
// submissions for the problem, under a lock. This makes it independent of the
// order in which workers finish, and safe for retries and rejudges.
// The Redis leaderboard is rebuilt from this table.
model ContestProblemResult {
  contestId       String
  userId          String
  problemId       String
  solved          Boolean  @default(false)
  wrongAttempts   Int      @default(0)   // counted BEFORE the first AC, by submission time
  solvedAtMinutes Int?     // minutes from contest start to the first AC's SUBMISSION time
  solvedAt        DateTime? // first AC's submission time (used for tie-breaks)

  contest Contest @relation(fields: [contestId], references: [id], onDelete: Cascade)

  @@id([contestId, userId, problemId])
  @@index([contestId, userId])
}
```

## 10.2 Design notes

- Hidden test cases and other users' source code must never be sent to the client.
- Store test cases in Postgres for the MVP (enforce size limits). Move to object storage later only if needed.
- `INTERNAL_ERROR` is not a verdict against the user; it must not create a penalty.
- Add indexes based on real queries, then verify with `EXPLAIN ANALYZE`.

---

# 11. Authentication

- Registration with email + username + password
- Passwords hashed with argon2id (or bcrypt with a sane cost factor)
- Short-lived JWT access token + refresh token
- Store tokens in httpOnly, secure, sameSite cookies
- Logout invalidates the refresh token
- Rate-limit login and registration endpoints
- Email verification and password reset are stretch features

---

# 12. Authorization

Enforce on the backend, always. The frontend hiding a button is not security.

| Action | Guest | User | Admin |
|---|---|---|---|
| View published problems | Yes | Yes | Yes |
| View contest problems before start | No | No | Yes |
| View contest problems during/after | No | Registered users | Yes |
| Submit code | No | Yes | Yes |
| View own submission + source | No | Yes | Yes |
| View others' submission source | No | No (only after contest ends, optional) | Yes |
| Create/edit problems, contests | No | No | Yes |
| View hidden test cases | No | No | Yes |
| Rejudge submissions | No | No | Yes |

Implementation: NestJS guards (`JwtAuthGuard`, `RolesGuard`) plus service-level ownership and contest-window checks.

---

# 13. REST API

Base path: `/api/v1`

## 13.1 Auth

```text
POST   /auth/register
POST   /auth/login
POST   /auth/refresh
POST   /auth/logout
GET    /auth/me
```

## 13.2 Problems

```text
GET    /problems                 (paginated, filter by difficulty)
GET    /problems/:slug           (statement + sample tests only)
POST   /admin/problems
PATCH  /admin/problems/:id
PUT    /admin/problems/:id/testcases
POST   /admin/problems/:id/publish
```

## 13.3 Contests

```text
GET    /contests                 (upcoming / running / past)
GET    /contests/:slug
POST   /contests/:slug/register
GET    /contests/:slug/problems  (only once contest has started)
GET    /contests/:slug/leaderboard
POST   /admin/contests
PATCH  /admin/contests/:id
PUT    /admin/contests/:id/problems
```

## 13.4 Submissions

```text
POST   /submissions              body: { problemId, contestId?, language, sourceCode }
GET    /submissions/:id
GET    /submissions/me           (paginated)
GET    /admin/submissions        (filters)
POST   /admin/submissions/:id/rejudge
```

## 13.5 Conventions

- Consistent error format: `{ statusCode, code, message, details?, requestId }`
- Cursor or offset pagination on all lists
- Input validation on every endpoint
- OpenAPI docs generated from DTOs
- Idempotency is not required for `POST /submissions`, but duplicates must be rate-limited

---

# 14. Submission Pipeline (the heart of the system)

## 14.1 Flow

```text
1. Client POST /submissions
2. API validates: auth, language, source size, problem access,
   contest window (server time), rate limit
3. API inserts Submission (status = QUEUED)
4. API enqueues BullMQ job { submissionId } with jobId = submissionId
5. API returns 201 { id, status: QUEUED }
6. Worker picks up the job
7. Worker loads submission + test cases from Postgres
8. Worker sets status COMPILING (if compiled language), publishes event
9. Worker compiles in sandbox -> on failure: COMPILATION_ERROR
10. Worker sets status RUNNING, publishes event
11. For each test case: run in sandbox, compare output, record result
    - stop at first failure (default)
12. Worker computes final verdict
13. Worker finalizes in ONE guarded transaction (see 14.3)
14. AFTER the commit, worker runs the idempotent side effects: recompute the
    user's leaderboard score from Postgres -> ZADD, publish final events
    (these run even if the transaction found the submission already finalized)
15. API's WebSocket gateway relays events to the submitting user
```

## 14.2 Source limits

- Max source size: 64 KB
- Allowed languages: from `languages.json` allowlist only
- Reject empty source

## 14.3 Idempotent finalization (critical)

A job can be delivered more than once (worker crash, retry, stalled job), and two workers can finish different submissions of the same user at the same time. Finalization must be safe to repeat and independent of completion order.

```text
BEGIN
  rows = UPDATE Submission
            SET status = :final, timeMs = ..., memoryKb = ..., judgedAt = now()
          WHERE id = :id AND status IN ('QUEUED','COMPILING','RUNNING')

  IF rows = 1 AND submission.contestId IS NOT NULL:
      -- this worker owns finalization for this submission
      take a lock on (contestId, userId, problemId)
          (pg_advisory_xact_lock or SELECT ... FOR UPDATE on the result row)
      recompute ContestProblemResult from the Submission rows of that
          (contest, user, problem), ordered by createdAt   -- see Section 19.3
  -- rows = 0: already finalized by an earlier attempt or another worker.
  --           Do NOT touch standings again.
COMMIT

-- ALWAYS after COMMIT, including when rows = 0:
--   recompute the user's leaderboard score from Postgres and ZADD it
--   publish submission.updated and leaderboard.updated
```

Why the post-commit steps run even when `rows = 0`: if a worker crashes after the commit but before updating Redis or publishing, the redelivered job will find the submission already finalized. If it exited quietly, Redis would stay stale forever. Because the post-commit steps only read Postgres and overwrite Redis with the recomputed value, repeating them is harmless. A periodic reconciliation job (Section 20.5) is the safety net.

Never update standings outside this guarded, locked transaction.

## 14.4 Rejudge

Admin rejudge resets the submission to `QUEUED`, deletes old test results, and recomputes contest standings for the affected user/problem. Design this early; it forces standings logic to be recomputable.

---

# 15. Sandbox Design and Security

This is the part interviewers will care about most. Document every decision in `docs/sandbox-security.md`.

## 15.1 Threat model

Assume every submission is hostile. Attempts to expect:

- Infinite loops (CPU exhaustion)
- Memory bombs (allocate until OOM)
- Fork bombs (process exhaustion)
- Huge output (fill disk / memory via stdout)
- Network access (exfiltrate data, attack internal services)
- Filesystem access (read secrets, write outside sandbox)
- Reading hidden test cases or other submissions
- Container escape attempts
- Trying to reach Docker socket, Redis, Postgres

## 15.2 Required container restrictions

```text
--network none                     no network at all
--memory <limit> --memory-swap <same>   hard memory cap, no swap
--cpus 1                           CPU cap
--pids-limit 64                    stops fork bombs
--read-only                        immutable root filesystem
--tmpfs /tmp:rw,size=64m           small writable scratch space
--cap-drop ALL                     no Linux capabilities
--security-opt no-new-privileges
--user 10001:10001                 non-root user
```

Additional requirements:

- Mount only the submission working directory: writable for the compile step, read-only during test runs (the run container gets its scratch space from the `/tmp` tmpfs, and the compiled binary is executed from the read-only mount)
- Java needs headroom: the container memory limit must exceed the JVM heap (for example heap 256 MB inside a container limited to about 512 MB), otherwise the JVM is OOM-killed for its own overhead and honest solutions get `MEMORY_LIMIT_EXCEEDED`. Calibrate per language and document it
- Never mount the Docker socket, env files, or host paths into a sandbox
- Never pass secrets as environment variables to sandbox containers
- Label every container (`codearena=true`, `submission=<id>`) so orphans can be found
- Always remove containers and temp directories in a `finally` block
- Run a periodic janitor that kills labeled containers older than a threshold

## 15.3 Limits enforced by the judge

- **Time:** wall-clock timeout enforced by the worker (kill container on expiry), plus a per-language time multiplier (Java/Python get more)
- **Memory:** container memory cap; detect OOM kill (exit code 137 / OOMKilled flag) -> `MEMORY_LIMIT_EXCEEDED`
- **Output:** cap captured stdout (for example 1 MB); exceeding it -> `RUNTIME_ERROR` or a dedicated output-limit verdict
- **Compile step:** separate limits (for example 10 s, 512 MB) so a compile bomb cannot hang a worker

## 15.4 Language configuration

Config-driven, not hard-coded:

```json
{
  "CPP17": {
    "image": "codearena-cpp:latest",
    "sourceFile": "main.cpp",
    "compile": "g++ -O2 -std=c++17 -o main main.cpp",
    "run": "./main",
    "timeMultiplier": 1.0
  },
  "PYTHON3": {
    "image": "codearena-python:latest",
    "sourceFile": "main.py",
    "compile": null,
    "run": "python3 main.py",
    "timeMultiplier": 3.0
  },
  "JAVA17": {
    "image": "codearena-java:latest",
    "sourceFile": "Main.java",
    "compile": "javac Main.java",
    "run": "java -Xmx256m Main",
    "timeMultiplier": 2.0
  }
}
```

## 15.5 Execution strategy

- **MVP:** compile once, then one container run per test case. Simple and safe.
- **Optimization later:** start one container per submission and use `docker exec` per test case to avoid container startup cost. Measure first, then decide.

## 15.6 Worker host security

The worker needs Docker access, which is effectively root on the host. Mitigate:

- Run the worker on a dedicated VM or host, separate from the database if possible
- Consider rootless Docker
- Advanced: use gVisor (`runsc`) or `isolate` for stronger isolation
- If time is tight, Judge0 (open-source) can replace the runner. Building your own is more impressive; using Judge0 is acceptable as a fallback, and document the decision in an ADR

## 15.7 Sandbox abuse test suite (write these as automated tests)

Each must produce the correct verdict and must not harm the host:

```text
- while(true){} loop                     -> TIME_LIMIT_EXCEEDED
- allocate 2 GB array                    -> MEMORY_LIMIT_EXCEEDED
- fork bomb                              -> RUNTIME_ERROR / contained
- print 500 MB to stdout                 -> output limit enforced
- attempt outbound network request       -> fails
- attempt to read /etc/passwd, env, host paths -> nothing sensitive exposed
- attempt to write to root filesystem    -> fails
- compile-time bomb (huge templates)     -> COMPILATION_ERROR / compile timeout
- sleep(100) (idle wait)                 -> TIME_LIMIT_EXCEEDED
- runtime crash (segfault)               -> RUNTIME_ERROR
```

---

# 16. Verdict Logic and Output Comparison

## 16.1 Verdict priority per test

```text
1. Compile failure            -> COMPILATION_ERROR (stop)
2. Time limit exceeded        -> TIME_LIMIT_EXCEEDED
3. Memory limit exceeded      -> MEMORY_LIMIT_EXCEEDED
4. Non-zero exit / crash      -> RUNTIME_ERROR
5. Output differs             -> WRONG_ANSWER
6. Otherwise                  -> passed test
```

Overall verdict: `ACCEPTED` only if all tests pass. Otherwise, the first failing test's verdict, and record `failedTestOrdinal`.

## 16.2 Comparison rules (default checker)

- Normalize line endings (`\r\n` -> `\n`)
- Ignore trailing whitespace on each line
- Ignore trailing blank lines at end of output
- Otherwise exact match
- Optional later: token-based compare, floating-point tolerance, custom checkers

Unit test the comparator heavily; this is a classic source of unfair verdicts.

## 16.3 Hidden test feedback

Show the user the failing test number, but never reveal hidden input or expected output. Sample tests may be shown in full.

---

# 17. Queue Reliability

## 17.1 BullMQ configuration

- `jobId = submissionId` (prevents duplicate enqueue)
- `attempts: 3` with exponential backoff, for system faults only
- Configurable worker `concurrency` (start low; each judge job is CPU-heavy)
- Stalled-job detection enabled so crashed workers release jobs
- Failed jobs kept for inspection; a dead-letter view for admins

## 17.2 Error classification

| Situation | Action |
|---|---|
| User code fails (WA, TLE, CE, ...) | Final verdict, no retry |
| Docker daemon error, image missing, DB blip | Retry with backoff |
| All retries exhausted | Mark `INTERNAL_ERROR`, alert, allow admin rejudge |

## 17.3 Crash scenarios to test

- Worker killed mid-judging -> job is retried, submission is judged exactly once in effect
- Two workers receive the same job -> only one finalization succeeds (guarded update)
- Redis restarts -> API and worker recover; leaderboard can be rebuilt
- Postgres briefly unavailable -> job retries

## 17.4 Backpressure

- If queue depth exceeds a threshold, show "high load" in the UI
- Per-user submission rate limit prevents one user from flooding the queue
- Optionally prioritize contest submissions over practice submissions using BullMQ priorities

---

# 18. Real-Time Architecture

## 18.1 WebSocket design

- Authenticate the connection during handshake using the JWT (reject unauthenticated connections)
- Rooms:
  - `user:{userId}` for personal submission updates
  - `contest:{contestId}` for leaderboard updates
- Only allow joining a contest room if the user may view that contest
- Events:

```text
submission.updated   { submissionId, status, failedTestOrdinal?, timeMs?, memoryKb? }
leaderboard.updated  { contestId, changedUserId }
contest.started      { contestId }
contest.ended        { contestId }
```

## 18.2 Worker to API delivery

The worker does not talk to browsers. It publishes events to Redis pub/sub (or via the Socket.IO Redis adapter); the API's gateway subscribes and emits to the right rooms. This lets you scale API instances horizontally.

## 18.3 Failure handling

- Client reconnects automatically and refetches current state via REST (WebSocket is not the source of truth)
- If the WebSocket is down, the UI falls back to polling `GET /submissions/:id` every few seconds
- Never rely on receiving every event; state must be recoverable

---

# 19. Contest Engine

## 19.1 Lifecycle (derived from time, computed server-side)

```text
UPCOMING  -> now < startsAt
RUNNING   -> startsAt <= now < endsAt
ENDED     -> now >= endsAt
```

Use server time only. Never trust client clocks.

## 19.2 Rules

- Registration allowed until contest end (or a configurable cutoff)
- Problems visible only after `startsAt`
- Submissions accepted only within `[startsAt, endsAt)` for contest submissions
- Late submissions after `endsAt` are rejected with a clear error
- Practice submissions on the same problem are separate (`contestId = null`)

## 19.3 Scoring (ICPC style)

- Rank by number of problems solved (descending)
- Ties broken by total penalty time (ascending); if still tied, by earlier time of the last accepted solution
- Per solved problem: `minutes from contest start to the first AC + penaltyMinutes x wrongAttempts before that AC`
- **All times are the submission's server-receive time (`createdAt`), not the time the verdict was produced.** Queue delay and slow judging must never cost a contestant penalty
- Wrong attempts on unsolved problems add no penalty
- Compilation errors and `INTERNAL_ERROR` do not count as wrong attempts
- Submissions after the problem is solved do not change the score
- Standings are **recomputed from Submission rows**, ordered by `createdAt`, not incremented: this makes the result correct even when an earlier submission finishes judging after a later one (for example a slow Wrong Answer finishing after a fast Accepted)

Example of the out-of-order case, which must be a test:

```text
t=10:00  submission S1 (will be WA, slow test)      created first
t=10:01  submission S2 (will be AC, fast)           created second
Worker B finalizes S2 -> AC   (standings: solved, 0 wrong attempts so far)
Worker A finalizes S1 -> WA   (S1 was created BEFORE the first AC, so it counts:
                               recompute gives 1 wrong attempt = +20 penalty)
Final state must equal the state you would get if S1 had finished first.
```

## 19.4 Leaderboard freeze (optional)

If `freezeAt` is set, the public leaderboard stops updating after that time; admins still see the live board; the final board is revealed at contest end.

## 19.5 Standings correctness rules (summary)

1. Postgres (`Submission` + `ContestProblemResult`) is authoritative; Redis is a rebuildable view
2. `ContestProblemResult` is recomputed from submissions under a per-(contest, user, problem) lock
3. Time-based rules use `Submission.createdAt` and the server clock only
4. Rejudge = reset the submission, then recompute the affected row; no special-case code path
5. Every side effect after the commit is idempotent

---

# 20. Leaderboard (Redis)

## 20.1 Data structure

One sorted set per contest: `leaderboard:{contestId}`

Encode rank into a single numeric score:

```text
score = solved * 10_000_000 - totalPenaltyMinutes
```

Higher score = better rank. Member = `userId`.

## 20.2 Update flow

1. Worker finalizes the verdict inside the locked Postgres transaction (Section 14.3)
2. After commit (always, even on redelivery), read that user's `ContestProblemResult` rows and compute `solved` and `penalty`
3. `ZADD leaderboard:{contestId} score userId` (overwrites, so it is idempotent)
4. Publish `leaderboard.updated`

Tie-break: members with equal scores are ordered by member name in Redis, which is arbitrary. For a fair tie-break on "earlier last AC", either encode it into the score's fractional part or sort ties in the API layer when joining with Postgres data. Pick one and document it in an ADR.

## 20.3 Reads

- Top N with `ZREVRANGE ... WITHSCORES`
- A user's rank with `ZREVRANK`
- Join usernames and per-problem status from Postgres (cache the enriched result briefly if needed)

## 20.4 Recovery

Provide an admin command/endpoint: `rebuild leaderboard for contest X` from Postgres. If Redis is wiped, the leaderboard must be fully restorable.

## 20.5 Reconciliation

While a contest is running, a lightweight job periodically (for example every minute) compares Postgres-derived scores with the Redis sorted set for that contest and repairs any drift. This covers the small window where a worker dies between the commit and the Redis update, and is verified in the Redis recovery experiment (Section 31.4).

---

# 21. Rate Limiting

Implemented in Redis.

- Submissions: for example 1 per 10 s per user per problem, and 30 per hour per user (configurable)
- Login / register: per-IP limits
- Return `429` with a `Retry-After` header
- Fail-open or fail-closed decision if Redis is down must be documented in an ADR

---

# 22. Frontend Requirements

## 22.1 Pages

```text
/                      landing + upcoming contests
/login, /register
/problems              list with filters
/problems/[slug]       statement + editor + submit
/contests              upcoming / running / past
/contests/[slug]       overview + register + countdown
/contests/[slug]/problems/[label]
/contests/[slug]/leaderboard
/submissions           my submissions
/submissions/[id]      detail view (verdict, per-test results)
/admin/problems        create/edit, upload test cases
/admin/contests        create/edit, attach problems
/admin/submissions     monitor, rejudge
```

## 22.2 UX requirements

- Monaco editor with language selector and per-language starter template
- Live verdict badge that updates without refresh (`Queued -> Running -> Accepted`)
- Contest countdown timer synced with server time
- Live leaderboard with your row highlighted
- Loading, empty, and error states everywhere
- Responsive layout (usable on a laptop and a phone for viewing)
- Keyboard-accessible controls and sufficient contrast
- Markdown + math rendering for problem statements (KaTeX)

## 22.3 State management

- TanStack Query for server data
- WebSocket events update the query cache
- No global state library unless a real need appears

---

# 23. Security Requirements

- Validate all input server-side (DTOs)
- Parameterized queries only (Prisma handles this)
- argon2/bcrypt password hashing; never log passwords or tokens
- Helmet, strict CORS, secure cookies
- Enforce authorization on every endpoint and WebSocket join
- Never expose hidden test data or others' source code
- Escape/sanitize rendered markdown (prevent XSS in problem statements)
- Rate-limit auth and submission endpoints
- Secrets only in environment variables; never committed
- Dependency audit in CI
- Sandbox isolation per Section 15

---

# 24. Testing Strategy

## 24.1 Unit tests

- Output comparator
- Verdict priority logic
- ICPC scoring and score encoding
- Contest lifecycle/time-window checks
- Rate limiter logic
- Standings recomputation, including the out-of-order finalization case (Section 19.3)
- Penalty uses submission time, not verdict time

## 24.2 Integration tests

- Auth flow and RBAC
- Submit -> queue -> judge -> verdict (with a real Docker sandbox in CI or a dedicated test job)
- Idempotent finalization (finalize twice -> standings change once)
- Redelivered job after a post-commit crash still repairs the Redis leaderboard
- Two workers finalizing two submissions of the same user/problem concurrently produce the same standings as sequential finalization
- Rejudge recomputes standings correctly
- Leaderboard rebuild from Postgres matches Redis

## 24.3 Sandbox abuse tests

The full list in Section 15.7, automated.

## 24.4 E2E tests (Playwright)

- Register -> log in -> solve a problem -> see Accepted
- Contest flow: register, wait for start, submit, see leaderboard update
- Admin flow: create problem + contest

## 24.5 Load tests (k6)

Scenarios:

- N concurrent users submitting simultaneously (queue behavior, verdict latency)
- Many WebSocket connections during a contest
- Heavy leaderboard reads

---

# 25. CI/CD

GitHub Actions pipeline:

```text
1. Install + cache dependencies
2. Lint + typecheck
3. Unit tests
4. Integration tests (Postgres + Redis services)
5. Build sandbox images
6. Sandbox/judge tests
7. Build Docker images (web, api, worker)
8. (main branch) Deploy to server via SSH / registry pull
9. Run Prisma migrations as a deploy step
```

Rules: never deploy with failing tests; run migrations in a controlled step, not on app start in production.

---

# 26. Docker and Deployment

## 26.1 Services

```text
web, api, worker, postgres, redis, nginx
+ sandbox images (built, not run as services)
```

## 26.2 Deployment requirements

- HTTPS via Let's Encrypt
- Environment-based configuration; `.env.example` committed, real `.env` never
- Postgres backups (scheduled dump) and a documented restore procedure
- Worker on a host where Docker access is acceptable (Section 15.6)
- Health checks for every service
- Log rotation

## 26.3 Environment variables (example)

```text
DATABASE_URL=
REDIS_URL=
JWT_ACCESS_SECRET=
JWT_REFRESH_SECRET=
CORS_ORIGIN=
JUDGE_CONCURRENCY=2
MAX_SOURCE_BYTES=65536
MAX_OUTPUT_BYTES=1048576
SUBMISSION_RATE_LIMIT_PER_MIN=6
QUEUE_NAME=judge
```

---

# 27. Observability

## 27.1 Logging

Structured JSON logs including `requestId`, `userId`, `submissionId`, `jobId`, verdict, and durations. Never log source code or secrets at info level.

## 27.2 Health checks

- `/health` (process alive)
- `/ready` (Postgres + Redis reachable; worker can reach Docker)

## 27.3 Metrics worth tracking

```text
Queue depth and wait time
Submission-to-verdict time (p50 / p95)
Judge duration per submission
Judge failures / retries / INTERNAL_ERROR count
Worker throughput (submissions per minute)
Active WebSocket connections
Leaderboard read latency
```

---

# 28. Development Phases

Do NOT build everything at once. Finish and verify each phase before starting the next.

## Phase 0 — Setup

- Monorepo, Next.js, NestJS, worker skeleton
- Postgres + Prisma, Redis, Docker Compose
- ESLint, Prettier, env config
- **Done when:** all services start with one command; DB connects

## Phase 1 — Auth and Users

- Register, login, refresh, logout, `me`
- Roles and guards
- **Done when:** RBAC test passes; passwords hashed; cookies secure

## Phase 2 — Problems and Test Cases

- Admin CRUD for problems, test case upload, publish flow
- Public problem list and detail (samples only)
- **Done when:** hidden tests are provably never returned by any public endpoint

## Phase 3 — Sandbox Runner (standalone first)

- Build language images
- Write a runner function: `run(language, source, input, limits) -> result`
- Implement all restrictions from Section 15
- **Done when:** the full abuse test suite (15.7) passes, run from a plain script with no queue or API involved

## Phase 4 — Judge Orchestration

- Compile -> run tests -> compare -> verdict
- Comparator with unit tests
- **Done when:** a sample problem judges correctly for all three languages, including CE/WA/TLE/MLE/RE cases

## Phase 5 — Queue and Submission API

- `POST /submissions`, BullMQ enqueue, worker consumer
- Idempotent finalization, retries, error classification
- **Done when:** killing a worker mid-judge still yields exactly one final verdict, and a redelivered job repairs stale Redis state

## Phase 6 — Real-Time Verdicts

- WebSocket gateway with auth and rooms
- Redis pub/sub bridge from worker to API
- **Done when:** the UI shows live `Queued -> Running -> Accepted` with polling fallback

## Phase 7 — Frontend Core

- Problem page with Monaco, submit, live verdict, submissions history
- **Done when:** a user can solve a problem entirely in the browser

## Phase 8 — Contests

- Contest CRUD, registration, lifecycle, time-window enforcement
- ICPC scoring, `ContestProblemResult`, Redis leaderboard, freeze option
- Rejudge with standings recompute
- **Done when:** a simulated 20-user contest produces the correct final standings, including out-of-order finalization and a rejudge

## Phase 9 — Hardening

- Rate limiting, queue backpressure, janitor for orphan containers
- Security review, logging, health checks
- **Done when:** abuse and crash scenarios (15.7, 17.3) pass

## Phase 10 — Testing, CI/CD, Deployment

- Integration + E2E tests, GitHub Actions
- Deploy with HTTPS and backups
- **Done when:** live URL works; CI is green

## Phase 11 — Load Test and Real Contest

- Run every experiment in Section 31 and write the results to `docs/benchmarks.md` and `docs/failure-experiments.md`
- Run a real contest with your college club
- **Done when:** you have measured metrics, recorded experiment results, and real-user numbers for the resume

## 28.1 Suggested schedule (about 8 weeks, part-time)

```text
Week 1   Phase 0-1   Setup, auth, roles
Week 2   Phase 2     Problems and hidden test cases; start sandbox images
Week 3   Phase 3     Sandbox runner + full abuse-test suite (most important week)
Week 4   Phase 4-5   Judge orchestration, queue, idempotent finalization
Week 5   Phase 6-7   Real-time verdicts, frontend core (editor, submit, history)
Week 6   Phase 8     Contests, scoring, leaderboard, rejudge
Week 7   Phase 9-10  Hardening, tests, CI/CD, deployment
Week 8   Phase 11    Benchmarks, failure experiments, real contest, README, resume bullets
```

Buffer rule: if you fall behind, drop Java support and leaderboard freeze first. Never drop the abuse tests, idempotent finalization, or the experiments.

---

# 29. Minimum Viable Product

If time runs short, the MVP is:

```text
Auth + roles
Problems + hidden test cases
Sandboxed judge (C++ and Python at minimum)
Queue + worker + idempotent verdicts
Submission page with live/polled verdicts
Basic contest with ICPC leaderboard
Docker + tests + deployment
```

Do NOT sacrifice judge correctness or sandbox safety for extra features.

## 29.1 After MVP

```text
Java support
Leaderboard freeze
Rejudge tooling
Admin analytics (acceptance rate, submissions per problem)
Rate limits and backpressure UI
k6 load-test report
```

## 29.2 Stretch (only if everything above is solid)

- Custom checkers (special judge)
- Per-user problem status badges and streaks
- Editorial/solution posts unlocked after contest
- Virtual contests (replay a past contest)
- Plagiarism similarity check between submissions
- gVisor-based sandbox
- Prometheus + Grafana dashboards
- Email notifications for contest reminders

---

# 30. Performance Goals (measure, do not assume)

```text
API p95 latency (non-judge endpoints):     < 300 ms
Submission enqueue (POST /submissions):     < 200 ms
Submission-to-verdict (simple problem):     a few seconds under normal load
Leaderboard read:                           < 100 ms
WebSocket event delivery after verdict:     near real-time
```

These are targets, not guarantees. Record actual numbers from load tests.

---

# 31. Benchmarking and Failure Experiments

The project should contain experiments that demonstrate engineering depth.

Do not invent the results. Run them and record the actual numbers.

## 31.1 Submission burst experiment

Run approximately:

```text
10 concurrent submissions
25 concurrent submissions
50 concurrent submissions
100 concurrent submissions
```

Measure:

```text
API enqueue latency
queue wait time
judge duration
submission-to-verdict p50
submission-to-verdict p95
throughput
failure count
```

The purpose is to show that the API remains responsive while the queue absorbs CPU-heavy work.

## 31.2 Worker scaling experiment

Compare:

```text
1 worker
2 workers
4 workers
```

Measure:

```text
submissions/minute
p95 verdict latency
CPU utilization
queue wait time
```

Explain where scaling stops helping and identify the bottleneck.

## 31.3 Worker crash experiment

Kill a worker during execution.

Verify:

```text
job becomes recoverable
submission is not permanently stuck
final verdict is produced
contest score changes at most once
```

## 31.4 Redis recovery experiment

Temporarily remove Redis or clear the leaderboard.

Verify:

```text
PostgreSQL still contains authoritative contest state
leaderboard can be rebuilt
normal operation resumes
```

## 31.5 WebSocket failure experiment

Disconnect a client during judging.

Verify:

```text
client reconnects
REST state is refetched
final submission state is correct
no correctness depends on receiving every WebSocket event
```

## 31.6 Sandbox abuse experiment

Run the hostile programs defined in the sandbox test suite.

Record:

```text
test
expected verdict
actual verdict
host impact
cleanup success
```

These experiments are part of the project's proof, not optional decoration.

---

# 32. Scalability Thought Exercise

Be ready to answer: "What if 5,000 users submit at once?"

- The API stays fast because it only inserts and enqueues
- The queue absorbs bursts; verdict latency grows, but nothing is lost
- Scale by adding worker hosts (each with its own concurrency)
- Prioritize contest submissions over practice
- Rate limits prevent a single user from dominating
- Leaderboard reads hit Redis, not Postgres
- Bottlenecks to discuss: worker CPU, Docker startup cost, DB write contention on standings, WebSocket fan-out

---

# 33. Engineering Rules

1. Modular monolith for the API; the worker is a separate process
2. PostgreSQL is the source of truth; Redis is rebuildable
3. The API never runs user code; only sandboxed workers do
4. Authorization is enforced on the backend
5. Use transactions where atomicity matters
6. Finalization must be idempotent
7. Validate all external input
8. Never trust client time
9. Never expose hidden tests or others' source
10. Never mount the Docker socket into a sandbox
11. Structured logging with correlation IDs
12. No secrets in the repository
13. Do not add technologies without a concrete reason
14. Prefer readable code over clever code
15. Write tests for verdict, scoring, and sandbox behavior first

---

# 34. AI Agent Development Instructions

Use an AI coding agent as a pair programmer, not an autopilot.

- Work one phase at a time; never ask the agent to "build the whole project"
- Make the agent inspect the repo before changing anything
- Require tests with every change
- Read and understand every piece of generated code, especially the sandbox, queue, and finalization logic
- Ask the agent to explain trade-offs, then write them into ADRs
- Commit small and often; review diffs before accepting

## 34.1 Master prompt (paste at the start of a session)

```text
You are a senior engineer helping me build "CodeArena", a coding contest
platform with a sandboxed judge. The full specification is in
codearena_final_build_spec.md. Read it before doing anything.

Stack: Next.js + TypeScript (web), NestJS (API), a separate Node worker,
PostgreSQL + Prisma, Redis, BullMQ, WebSockets, Docker.

Rules:
1. Work phase by phase as defined in the spec. Do not implement unrelated features.
2. Inspect the repository first and summarize the current state briefly.
3. Propose the smallest next step, then implement it.
4. Add or update tests for everything you change.
5. Run lint, typecheck and relevant tests; report the results honestly.
6. PostgreSQL is the source of truth. Redis must be rebuildable.
7. The API never executes user code. Only the worker does, inside Docker sandboxes.
8. Verdict finalization must be idempotent (guarded UPDATE in a transaction), and
   standings must be RECOMPUTED from Submission rows under a lock, never incremented.
   Post-commit side effects (Redis, events) must be safe to repeat.
9. Contest time rules use the submission's server-receive time (createdAt), never
   the verdict time and never the client clock.
10. Never expose hidden test cases or other users' source code.
11. Never disable validation, tests or type checks to make something pass.
12. Do not add dependencies without a concrete reason.
13. After finishing, list exactly what changed, trade-offs, and any remaining issues.

Do not build the entire project at once.
```

## 34.2 Feature prompt template

```text
Implement [FEATURE] from Phase [N] of the spec.

Before coding:
1. Inspect the existing architecture.
2. List affected modules (web / api / worker / shared packages).
3. List database changes.
4. List authorization requirements.
5. List API or event changes.
6. List tests required.

Then:
1. Implement database changes and migrations.
2. Implement backend logic.
3. Implement endpoints / events.
4. Implement frontend integration with loading, error and empty states.
5. Add tests.
6. Update documentation.

Do not change unrelated code. Do not add dependencies unless necessary.

After implementation: run typecheck, lint and tests; explain what changed and
the trade-offs; list any manual commands I should run.
```

## 34.3 Debugging prompt

```text
I hit this error:

[PASTE ERROR]

Do not rewrite the implementation immediately.
1. Identify the likely root cause.
2. Inspect the relevant files.
3. Explain why it happens.
4. Propose the smallest correct fix.
5. Apply it and run the relevant test/build.
6. Confirm whether the problem is actually resolved.

Do not hide the problem by disabling validation, tests or type checking.
```

## 34.4 Sandbox security review prompt

```text
Review the sandbox and judge implementation as a security engineer.

Check against the threat model in Section 15 of the spec:
- Container flags (network, memory, cpu, pids, read-only, caps, user)
- Any host path, socket, or secret exposed to sandbox containers
- Timeout and OOM detection correctness
- Output size limits
- Cleanup of containers and temp directories on all code paths
- Orphan container handling

Classify findings as CRITICAL / HIGH / MEDIUM / LOW with concrete fixes.
Then write any missing abuse tests from Section 15.7.
```

## 34.5 Experiment prompt (Section 31)

```text
Help me run experiment [31.X] from the spec.

1. Write the script or k6 scenario, and list the exact commands to run it.
2. Tell me which metrics to capture and how (logs, queue stats, docker stats).
3. After I paste the raw output, help me summarize it in a table.
4. Do NOT invent or estimate any numbers. If a value is missing, say so.
5. Append the results, the test environment (CPU, RAM, worker count), and the
   date to docs/benchmarks.md or docs/failure-experiments.md.
6. Point out the bottleneck the data actually shows.
```

## 34.6 General code review prompt

```text
Perform a senior-level review of the current code. Cover: architecture,
authentication, authorization, database design and indexes, transactions,
idempotency, race conditions, queue reliability, WebSocket auth and rooms,
Redis usage and recovery, error handling, validation, logging, tests,
and deployment readiness.

Classify findings as CRITICAL / HIGH / MEDIUM / LOW.
Give concrete fixes. Do not rewrite everything.
```

---

# 35. Interview Preparation

## 35.1 Questions you must be able to answer

### Sandbox and security
- How do you run untrusted code safely? What does each Docker flag do?
- How do you stop a fork bomb? A memory bomb? Output flooding?
- Why is mounting the Docker socket dangerous?
- What are the limits of Docker isolation, and what would gVisor add?

### Queue and reliability
- Why a queue instead of judging in the request handler?
- What happens if a worker crashes mid-judge?
- How do you guarantee a submission is judged once in effect?
- What is idempotency, and where do you rely on it?
- What is a dead-letter queue and how do you use it?

### Database
- Why PostgreSQL? Which indexes did you add and why?
- Where do you use transactions?
- How do you prevent double-counting a solved problem in standings?

### Redis and leaderboard
- Why a sorted set? How did you encode the score?
- What happens if Redis is wiped?
- How do you rate-limit submissions?

### Real-time
- How are WebSocket connections authenticated?
- How do events get from the worker to the right browser?
- What happens when the connection drops?

### Standings and consistency
- Why do you recompute a user's problem result from submissions instead of incrementing a counter?
- Two submissions from the same user finish out of order. What happens to the penalty?
- A worker dies after the commit but before updating Redis. How does the leaderboard recover?
- Why is penalty time based on submission time and not verdict time?
- How does a rejudge fit into this design without special cases?

### Fairness and correctness
- How do you compare outputs? What edge cases exist?
- How do you handle time limits fairly across languages?
- Why must `INTERNAL_ERROR` not count as a penalty?

### Deployment
- How does CI/CD work? How do migrations run?
- How do you monitor the system? How are backups handled?

## 35.2 Trade-offs to be ready to defend

- One container per test vs one container per submission
- Building your own runner vs using Judge0
- Wall-clock timing vs CPU-time measurement
- Fail-open vs fail-closed rate limiting when Redis is down
- Storing test cases in Postgres vs object storage

---

# 36. How to Position the Project

The strongest story is not:

> "I built a website where people solve coding problems."

The stronger story is:

> "I built a college coding contest platform whose core system securely executes untrusted programs, processes submissions asynchronously, survives worker failures, maintains consistent contest standings, and provides measured performance under concurrent load."

When explaining the project, spend most of the time on:

```text
Submission
   ↓
API
   ↓
PostgreSQL + Queue
   ↓
Worker
   ↓
Sandbox
   ↓
Verdict
   ↓
Transactional contest update
   ↓
Redis leaderboard
   ↓
WebSocket
   ↓
Browser
```

Be able to explain every failure point in this pipeline.

The project should produce three kinds of evidence:

1. **Code evidence** — clean implementation and tests
2. **Experiment evidence** — load/failure/security measurements
3. **Real-world evidence** — an actual contest with real users

---

# 37. Resume Positioning

Do NOT write: "Built a coding platform using Next.js and NestJS."

After you have real measurements, use bullets like this (replace every placeholder with your own measured numbers; never invent metrics):

```text
CodeArena — College Coding Contest Platform
Next.js, TypeScript, NestJS, PostgreSQL, Redis, BullMQ, WebSockets, Docker

• Built a code-judging engine that executes untrusted C++/Python/Java submissions
  in resource-limited Docker sandboxes (no network, capped CPU/memory/PIDs,
  read-only filesystem), validated against an automated abuse-test suite.

• Designed a BullMQ-based judging pipeline with retries and idempotent verdict
  finalization, ensuring exactly-once effect on standings even when workers crash.

• Implemented live verdict delivery over WebSockets and an ICPC-style contest
  leaderboard on Redis sorted sets, rebuildable from PostgreSQL.

• Load-tested with k6: [N] concurrent submissions with p95 submission-to-verdict
  time of [X] s; [M] concurrent WebSocket connections; scaled from 1 to [W]
  workers for [Y]x throughput before the bottleneck shifted to [measured cause].

• Verified failure recovery by killing workers mid-judge and wiping Redis:
  every submission reached exactly one final verdict and the leaderboard was
  rebuilt from PostgreSQL with no incorrect standings.

• Deployed with Docker, Nginx and GitHub Actions CI/CD; ran a live contest with
  [N] students at [college], processing [M] submissions.
```

---

# 38. Metrics Worth Measuring

```text
Submission-to-verdict time (p50 / p95)
Worker throughput (submissions per minute)
Queue wait time under load
Max concurrent WebSocket connections tested
Leaderboard read latency
Number of sandbox abuse tests passing
Unit / integration / E2E test counts
Real contest: participants, submissions, judged with zero lost submissions
```

Do not invent metrics. If a number is not measured, leave it off the resume.

---

# 39. Final Definition of Done

## Product
- [ ] Users can register and log in
- [ ] Admins can create problems with hidden test cases
- [ ] Users can submit in C++, Python (and Java)
- [ ] Correct verdicts for AC / WA / TLE / MLE / RE / CE
- [ ] Live verdict updates in the UI
- [ ] Contests with registration, timing rules, and ICPC scoring
- [ ] Live leaderboard
- [ ] Admin rejudge

## Engineering
- [ ] Sandbox restrictions implemented and documented
- [ ] Sandbox abuse test suite passing
- [ ] Idempotent verdict finalization with locked, recomputed standings
- [ ] Out-of-order finalization and redelivery tests passing
- [ ] Queue retries and crash recovery verified
- [ ] Rate limiting
- [ ] Leaderboard rebuild from Postgres works
- [ ] Authorization enforced on every endpoint and WebSocket room
- [ ] Hidden tests never exposed
- [ ] Structured logging and health checks

## Infrastructure and Quality
- [ ] Docker Compose for local and production
- [ ] CI pipeline (lint, typecheck, tests, build)
- [ ] Live deployment with HTTPS
- [ ] Database backups
- [ ] Unit, integration, sandbox, and E2E tests
- [ ] k6 load test report with real numbers
- [ ] Architecture doc, sandbox security doc, ADRs, README with diagram and screenshots

## Proof
- [ ] Submission burst experiment recorded (Section 31.1)
- [ ] Worker scaling experiment recorded (Section 31.2)
- [ ] Worker crash, Redis recovery, WebSocket failure and sandbox abuse experiments recorded (Sections 31.3-31.6)
- [ ] `docs/benchmarks.md` and `docs/failure-experiments.md` contain real numbers, test environment and date
- [ ] A real contest was run with real users
- [ ] Resume bullets use measured numbers only

---

# 40. Final Goal

The project should demonstrate that you can:

```text
Model a real domain
   |
Build a secure REST API
   |
Build a responsive full-stack UI
   |
Run untrusted code safely
   |
Process work asynchronously and reliably
   |
Deliver real-time updates
   |
Design for concurrency and failure
   |
Test, containerize, deploy and measure it
```

The main message:

> **"I built and shipped a system that runs untrusted code safely at scale, and real people used it."**

The technologies are secondary. The depth and the proof are what matter.

---

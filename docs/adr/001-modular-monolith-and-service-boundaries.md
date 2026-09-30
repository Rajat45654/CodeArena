# ADR 001: Modular Monolith API and Dedicated Judge Worker Boundary

## Status
Accepted

## Context
CodeArena consists of high-level user and contest management (authentication, problems CRUD, contest schedules, leaderboard delivery) and low-level, CPU-intensive code execution (Docker container lifecycle, compiler execution, process resource limiting).

Running code execution inside the main HTTP API server would introduce severe risks:
1. Long-running or heavy CPU compile jobs would block the Node.js event loop or starve API threads.
2. The API server would require direct access to the Docker daemon (`docker.sock`), effectively granting root-level permissions to the public-facing service.
3. Microservices architectures (10+ separate deployables) would introduce excessive operational overhead and distributed transaction complexities before establishing core system correctness.

## Decision
We decouple the system into two distinct backend processes within a unified monorepo:
1. **NestJS API Service (`apps/api`):** A modular monolith handling REST endpoints, database access via Prisma, BullMQ job producer, and WebSocket gateway. It never touches Docker.
2. **Judge Worker Process (`apps/worker`):** A dedicated background Node.js worker consuming judging jobs from BullMQ and interacting with Docker Engine.

## Consequences
- **Positive:** Strong security isolation (public API has zero Docker access). CPU-heavy execution is completely offloaded from the request-response thread. Scalability is simplified: workers can scale horizontally independently of API instances.
- **Negative:** Requires managing an asynchronous queue (BullMQ + Redis) and handling distributed failure cases (worker crashes, retries).

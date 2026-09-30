# ADR 003: Idempotent Contest Standings and Redis Leaderboard Recovery

## Status
Accepted

## Context
In a distributed judging system, workers may crash mid-evaluation, jobs may be retried by BullMQ, and multiple workers may finish submissions for the same user out-of-order (e.g., an earlier slow submission finishes after a later fast submission).
If contest standings were updated via incremental updates (`score += 1`, `penalty += 20`), retries or out-of-order completions would irreparably corrupt the leaderboard.

## Decision
1. **Guarded State Transition:** Submissions are finalized with a guarded SQL UPDATE:
   ```sql
   UPDATE submissions
   SET status = :finalVerdict, ...
   WHERE id = :id AND status IN ('QUEUED', 'COMPILING', 'RUNNING');
   ```
2. **Deterministic Recomputation:** If the update succeeds, the worker acquires an advisory transaction lock on `(contestId, userId, problemId)` and **recomputes** `ContestProblemResult` from scratch by querying all submissions for that specific `(contest, user, problem)` tuple ordered by `createdAt`.
3. **Idempotent Redis Mirror:** The Redis sorted set score is computed deterministically from PostgreSQL rows:
   $$\text{Score} = (\text{Solved Count} \times 10,000,000) - \text{Total Penalty Minutes}$$
   and applied via `ZADD`, making repeated or out-of-order executions idempotent.
4. **Postgres Source of Truth:** If Redis fails or is flushed, an admin endpoint or reconciliation job can reconstruct the entire contest leaderboard from Postgres with zero data loss.

## Consequences
- **Positive:** Guaranteed consistency under concurrency, worker crashes, network timeouts, and out-of-order finalization.
- **Negative:** Slightly higher DB read cost during finalization, which is mitigated by composite indexes on `(contestId, userId, problemId, createdAt)`.

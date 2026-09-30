import React from 'react';
import { Terminal, Shield, Cpu, Trophy, ArrowRight, Activity, Zap } from 'lucide-react';

export default function HomePage() {
  return (
    <main className="min-h-screen bg-[#090d16] text-slate-100">
      {/* Navigation */}
      <header className="border-b border-slate-800/80 bg-slate-950/40 backdrop-blur sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="h-9 w-9 rounded-lg bg-indigo-600/20 border border-indigo-500/40 flex items-center justify-center text-indigo-400 font-bold">
              <Terminal className="w-5 h-5" />
            </div>
            <span className="text-xl font-bold tracking-tight bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">
              CodeArena
            </span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-medium">
              v1.0 System Architecture
            </span>
          </div>
          <nav className="flex items-center space-x-6 text-sm">
            <a href="#pipeline" className="text-slate-400 hover:text-slate-200 transition-colors">
              Judge Pipeline
            </a>
            <a href="#sandbox" className="text-slate-400 hover:text-slate-200 transition-colors">
              Sandbox Security
            </a>
            <a href="#contests" className="text-slate-400 hover:text-slate-200 transition-colors">
              ICPC Contests
            </a>
            <span className="h-4 w-px bg-slate-800" />
            <a
              href="http://localhost:4000/api/docs"
              target="_blank"
              rel="noreferrer"
              className="text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 px-3 py-1.5 rounded-md border border-slate-700 font-mono transition-colors"
            >
              API Docs (Swagger)
            </a>
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <section className="max-w-7xl mx-auto px-6 pt-20 pb-16">
        <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full border border-indigo-500/30 bg-indigo-500/10 text-indigo-300 text-xs font-medium mb-6">
          <Zap className="w-3.5 h-3.5" />
          <span>Production-grade asynchronous code judging & ICPC contests</span>
        </div>
        <h1 className="text-5xl md:text-6xl font-extrabold tracking-tight text-white max-w-4xl leading-tight">
          High-concurrency coding contest platform with sandboxed execution.
        </h1>
        <p className="mt-6 text-lg text-slate-400 max-w-2xl leading-relaxed">
          Accepts arbitrary C++, Python, and Java code from untrusted users, executes safely inside
          hardened resource-limited Docker containers, guarantees idempotent ICPC scoring, and pushes
          live verdicts via WebSockets.
        </p>

        {/* System Pillars */}
        <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="p-6 rounded-xl border border-slate-800/80 bg-slate-900/40 backdrop-blur hover:border-slate-700 transition-colors">
            <div className="w-10 h-10 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 mb-4">
              <Shield className="w-5 h-5" />
            </div>
            <h2 className="text-lg font-semibold text-white">Hardened Docker Sandbox</h2>
            <p className="mt-2 text-sm text-slate-400 leading-relaxed">
              No network access (<code className="text-indigo-300 font-mono text-xs">--network none</code>),
              capped memory/CPU/PIDs, non-root user (10001), read-only rootfs, and automated abuse-test suite.
            </p>
          </div>

          <div className="p-6 rounded-xl border border-slate-800/80 bg-slate-900/40 backdrop-blur hover:border-slate-700 transition-colors">
            <div className="w-10 h-10 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 mb-4">
              <Cpu className="w-5 h-5" />
            </div>
            <h2 className="text-lg font-semibold text-white">BullMQ Asynchronous Judge</h2>
            <p className="mt-2 text-sm text-slate-400 leading-relaxed">
              Burst absorption, guarded transactional finalization, and resilient crash recovery.
              Postgres remains authoritative while Redis powers rate limiting and live standings.
            </p>
          </div>

          <div className="p-6 rounded-xl border border-slate-800/80 bg-slate-900/40 backdrop-blur hover:border-slate-700 transition-colors">
            <div className="w-10 h-10 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 mb-4">
              <Trophy className="w-5 h-5" />
            </div>
            <h2 className="text-lg font-semibold text-white">Idempotent ICPC Standings</h2>
            <p className="mt-2 text-sm text-slate-400 leading-relaxed">
              Standings recomputed from submission rows under an advisory lock. Out-of-order worker
              completion never corrupts penalty or solves. Redis sorted set rebuildable from Postgres.
            </p>
          </div>
        </div>

        {/* Pipeline Architecture Diagram Card */}
        <div id="pipeline" className="mt-16 p-8 rounded-2xl border border-slate-800 bg-slate-950/60">
          <div className="flex items-center justify-between pb-6 border-b border-slate-800">
            <div>
              <h2 className="text-xl font-bold text-white">Execution Pipeline Overview</h2>
              <p className="text-sm text-slate-400 mt-1">End-to-end lifecycle of a submission</p>
            </div>
            <span className="flex items-center space-x-2 text-xs font-mono text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>Pipeline Configured</span>
            </span>
          </div>

          <div className="mt-6 font-mono text-xs text-slate-300 bg-slate-900/80 p-6 rounded-xl border border-slate-800 overflow-x-auto leading-relaxed">
            <pre>{`Browser (Next.js)
  │ POST /submissions (Validates: Auth, Language, 64KB max, Rate Limit)
  ▼
NestJS API ──▶ Insert Submission (Status: QUEUED) ──▶ BullMQ Enqueue { submissionId }
                                                            │
┌───────────────────────────────────────────────────────────┘
▼
Worker Process (BullMQ Consumer)
  ├─▶ 1. Set Status: COMPILING (publishes event)
  ├─▶ 2. Sandbox Compile (g++ / javac) ──(Failure: COMPILATION_ERROR)
  ├─▶ 3. Set Status: RUNNING (publishes event)
  ├─▶ 4. Testcase Loop inside Docker Sandbox (limits: CPU, Mem, PIDs, read-only, no network)
  ├─▶ 5. Output Normalization & Comparison (\\r\\n -> \\n, strip trailing whitespace)
  ├─▶ 6. Guarded DB Transaction: UPDATE Submission WHERE status IN (QUEUED, COMPILING, RUNNING)
  │       └─▶ Take Lock on (contestId, userId, problemId) ──▶ Recompute ContestProblemResult
  └─▶ 7. Post-Commit Idempotent Side Effects:
          ├─▶ Recompute Redis Leaderboard Score ──▶ ZADD
          └─▶ Redis Pub/Sub ──▶ WebSocket Gateway ──▶ Browser (submission.updated, leaderboard.updated)`}</pre>
          </div>
        </div>
      </section>
    </main>
  );
}

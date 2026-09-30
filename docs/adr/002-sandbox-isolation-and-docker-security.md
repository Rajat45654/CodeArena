# ADR 002: Sandbox Isolation and Container Hardening Strategy

## Status
Accepted

## Context
CodeArena allows untrusted public users to submit arbitrary code in compiled (C++, Java) and interpreted (Python) languages. Attackers could attempt fork bombs, memory exhaustion, file exfiltration, network-based SSRF/DDoS, or host escapes.

## Decision
We enforce a multi-layered sandbox execution model using Docker containers with hardened flags:
- `--network none` (complete network blackout)
- `--pids-limit 64` (fork-bomb prevention)
- `--read-only` root filesystem with minimal 64MB tmpfs for `/tmp`
- `--cap-drop ALL` and `--security-opt no-new-privileges`
- Non-root execution under UID/GID `10001:10001`
- Separate compile phase (workspace mounted read-write) and test-run phase (workspace mounted read-only `:ro`)
- Output truncation capped at 1 MB to prevent memory exhaustion

## Consequences
- **Positive:** Robust defense-in-depth against malicious code submissions without requiring complex hypervisor infrastructure initially.
- **Negative:** Container startup overhead (~100-200ms per container). Java requires calibrated memory headroom due to JVM native runtime overhead.

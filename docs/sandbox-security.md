# CodeArena Sandbox Security Specification

## 1. Threat Model & Untrusted Code Execution

CodeArena executes arbitrary user submissions in C++, Python, and Java. We treat **every submission as explicitly adversarial**.

### Attacks Addressed:
1. **CPU Exhaustion (Infinite Loops):** Prevented via strict wall-clock and CPU time limits.
2. **Memory Bombs (Greedy Allocation / OOM):** Prevented via hard container memory limits without swap (`--memory`, `--memory-swap`).
3. **Fork Bombs (Process Table Starvation):** Prevented via strict PID limits (`--pids-limit 64`).
4. **Stdout / Disk Flooding:** Prevented via stdout buffer truncation (max 1 MB) and read-only root filesystems.
5. **Network Attacks & Exfiltration:** Prevented via complete network disconnection (`--network none`).
6. **Filesystem Compromise & Secret Sniffing:** Prevented by running as unprivileged user `10001:10001`, dropping all Linux capabilities (`--cap-drop ALL`), and mounting root as read-only (`--read-only`).
7. **Container Escape / Privilege Escalation:** Prevented via `--security-opt no-new-privileges`, never mounting Docker socket, and unprivileged execution.

---

## 2. Docker Container Security Restrictions

When a runner executes user code, the container is spawned with the following flags:

| Flag | Value | Purpose |
|---|---|---|
| `--network` | `none` | Absolute network isolation. Zero socket creation to external or internal hosts. |
| `--memory` | `<limit>` | Hard RAM ceiling (e.g. 256MB for C++/Python, 512MB for Java). |
| `--memory-swap` | `<same as memory>` | Disables swap entirely to prevent host disk thrashing. |
| `--cpus` | `1.0` | Bounds CPU core execution time. |
| `--pids-limit` | `64` | Restricts total concurrent processes/threads (kills fork bombs). |
| `--read-only` | `true` | Makes container root filesystem completely immutable. |
| `--tmpfs` | `/tmp:rw,size=64m` | Small, ephemeral in-memory scratch space for compiler and runtimes. |
| `--cap-drop` | `ALL` | Drops all Linux root capabilities (e.g., `CAP_NET_RAW`, `CAP_SYS_ADMIN`). |
| `--security-opt` | `no-new-privileges` | Blocks `setuid` binaries from gaining elevated permissions. |
| `--user` | `10001:10001` | Non-root runtime user (`sandbox`). |

---

## 3. Host and Runner Lifecycle Hygiene

1. **Ephemeral Workspace Mounts:**
   - Source code is written into a dedicated host temp directory labeled with UUIDs.
   - For compilation: Mounted writable.
   - For test runs: Mounted **read-only** (`:ro`).
2. **Container Tagging & Janitor:**
   - Every execution container is labeled: `codearena=true`, `submission=<id>`, `createdAt=<timestamp>`.
   - Containers are guaranteed to be cleaned up in a `finally` block.
   - A background janitor periodically cleans up any orphaned containers older than 5 minutes.
3. **No Docker Socket Exposure:**
   - The Docker socket `/var/run/docker.sock` is accessible **only** to the worker process host, and is **never** mounted into any sandbox container.

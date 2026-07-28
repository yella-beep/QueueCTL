# QueueCTL

A CLI-based background job queue system with worker processes, automatic
retries with exponential backoff, a dead letter queue for permanently failed
jobs, and crash recovery.

## Setup

```powershell
npm install
npm link
```

This makes `queuectl` available as a global command in your terminal.

If `npm link` doesn't work on your machine, run commands directly instead:
```powershell
node bin/queuectl.js <command>
```

## Usage

**Enqueue a job:**
```powershell
queuectl enqueue --file job.json
```
where `job.json` looks like:
```json
{"id": "job1", "command": "echo hello", "max_retries": 3}
```

**Start workers (foreground, blocks until stopped):**
```powershell
queuectl worker start
```

**Stop workers from a separate terminal:**
```powershell
queuectl worker stop
```

**List jobs:**
```powershell
queuectl list
queuectl list --state pending --json
```

**Check overall status:**
```powershell
queuectl status
```

**Dead letter queue:**
```powershell
queuectl dlq list
queuectl dlq retry <id>
```

**Configuration:**
```powershell
queuectl config set backoff-base 3
queuectl config get backoff-base
```

## Architecture

- **Storage:** SQLite (`better-sqlite3`), synchronous, single database file.
- **Atomic claiming:** each job claim runs inside a `BEGIN IMMEDIATE`
  transaction, which takes a write lock across the whole database file before
  reading, guaranteeing exactly-once claiming across separate OS processes.
  See `DECISIONS.md` Q1 for the full explanation and verification.
- **Crash recovery:** workers write a heartbeat timestamp to their claimed job
  every 5 seconds. A reaper check (run periodically inside every worker's own
  loop) resets any `processing` job whose heartbeat has gone stale (15s+)
  back to `pending`. Worst-case recovery time is roughly 20 seconds. See
  `DECISIONS.md` Q2.
- **Retry & backoff:** failed jobs retry with delay = `backoff_base ^ attempts`
  seconds, moving to the DLQ (`dead`) after `max_retries` attempts.
- **Worker signaling:** `worker start` writes a PID file; `worker stop` writes
  a corresponding stop-flag file, which the worker polls for and honors after
  finishing any in-flight job. Chosen over SIGTERM due to unreliable signal
  delivery on Windows. See `DECISIONS.md` Q4.

## Testing

All 5 required scenarios were manually verified during development:
1. Basic job completion
2. Failing job retries with backoff, lands in DLQ
3. Multiple concurrent workers (separate OS processes) claim jobs with zero duplicates
4. Worker killed (SIGKILL) mid-job; automatically recovered and completed after restart
5. Job state persists correctly across a full stop/restart

Test scripts used during development are in `test/`.

## AI Usage Note

I used Claude extensively throughout this project — for planning the overall
architecture and file structure, working through the atomic-locking design,
debugging PowerShell-specific issues (quoting, signal handling differences on
Windows), and reviewing my own test results before trusting them. All core
logic was written and understood by me; AI assistance was used for design
discussion, debugging guidance, and reviewing test methodology rather than
having code generated wholesale without understanding it.

## Known Limitations

- Reaper check interval (5s) plus staleness threshold (15s) means worst-case
  crash recovery is ~20s, not instant — acceptable within the 60s requirement
  but not aggressive.
- No priority queue support yet (see `DECISIONS.md` Q5 for what would need to change).
- Config changes to `max-retries` only affect newly enqueued jobs (stored per-job at
  enqueue time); `backoff-base` changes apply retroactively to jobs already in progress.

## Time Spent

15 hours
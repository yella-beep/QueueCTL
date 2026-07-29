# QueueCTL

A CLI-based background job queue system with worker processes, automatic retries with exponential backoff, a dead letter queue for permanently failed jobs, and crash recovery.

## Demo Recording

[Click here to watch the demo video](https://youtu.be/p2s32dvIUWg)

## Setup

```bash
npm install
npm link
```

This makes `queuectl` available as a global command in your terminal.

If `npm link` doesn't work on your machine, run commands directly instead:
```bash
node bin/queuectl.js <command>
```

## Usage

**Enqueue a job:**
```bash
queuectl enqueue '{"id":"job1","command":"echo hello","max_retries":3}'
```
*Note for Windows Command Prompt (`cmd.exe`): Command Prompt does not support single quotes `'` for strings. `queuectl` includes a built-in relaxed parser to automatically reconstruct the JSON in this case, allowing you to run the exact same command in CMD without errors. If you hit other quoting issues in PowerShell, you can also use a file instead:*
```bash
queuectl enqueue --file job.json
```
where `job.json` looks like:
```json
{"id": "job1", "command": "echo hello", "max_retries": 3}
```

**Start workers (foreground, blocks until stopped):**
```bash
queuectl worker start
```

**Start multiple workers at once, each as a separate OS process:**
```bash
queuectl worker start --count 3
```

**Stop workers from a separate terminal:**
```bash
queuectl worker stop
```

**List jobs:**
```bash
queuectl list
queuectl list --state pending --json
```

**Check overall status:**
```bash
queuectl status
```

**Dead letter queue:**
```bash
queuectl dlq list
queuectl dlq retry <id>
```

**Configuration:**
```bash
queuectl config set backoff-base 3
queuectl config get backoff-base
queuectl config set max-retries 5
```

## Architecture

- **Storage:** SQLite (`better-sqlite3`), synchronous, single database file.
- **Atomic claiming:** each job claim runs inside a `BEGIN IMMEDIATE` transaction, which takes a write lock across the whole database file before reading, guaranteeing exactly-once claiming across separate OS processes. See `DECISIONS.md` Q1 for the full explanation and verification.
- **Crash recovery:** workers write a heartbeat timestamp to their claimed job every 5 seconds. A reaper check (run periodically inside every worker's own loop) resets any `processing` job whose heartbeat has gone stale (15s+) back to `pending`. Worst-case recovery time is roughly 20 seconds. See `DECISIONS.md` Q2.
- **Retry & backoff:** failed jobs retry with delay = `backoff_base ^ attempts` seconds, moving to the DLQ (`dead`) after `max_retries` attempts.
- **Worker signaling:** `worker start` writes a PID file; `worker stop` writes a corresponding stop-flag file, which the worker polls for and honors after finishing any in-flight job. Chosen over SIGTERM due to unreliable signal delivery on Windows. See `DECISIONS.md` Q4.

## Testing

All 5 required scenarios were manually verified during development:
1. Basic job completion
2. Failing job retries with backoff, lands in DLQ
3. Multiple concurrent workers (separate OS processes) claim jobs with zero duplicates
4. Worker killed (SIGKILL) mid-job; automatically recovered and completed after restart
5. Job state persists correctly across a full stop/restart

Test scripts used during development are in `test/`.


## Known Limitations

- Reaper check interval (5s) plus staleness threshold (15s) means worst-case crash recovery is ~20s, not instant — acceptable within the 60s requirement but not aggressive.
- No priority queue support yet (see `DECISIONS.md` Q5 for what would need to change).
- Config changes to `max-retries` only affect newly enqueued jobs (stored per-job at enqueue time); `backoff-base` changes apply retroactively to jobs already in progress.
- Worker signaling uses a polled stop-flag file rather than OS signals, chosen specifically for reliability on Windows (see `DECISIONS.md` Q4).

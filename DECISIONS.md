# DECISIONS.md

## 1. Which exact line(s) prevent two workers from claiming the same job, and why is that operation atomic across separate OS processes?

The claim happens inside `src/claim.js`, in `claimNextJob()`. The whole operation
(SELECT the next eligible job, then UPDATE it to `processing`) is wrapped in a
`better-sqlite3` transaction called with `.immediate()`:

```js
const claim = db.transaction(() => {
  const job = db.prepare(`SELECT ... WHERE state = 'pending' ... LIMIT 1`).get(...);
  if (!job) return null;
  db.prepare(`UPDATE jobs SET state = 'processing', ... WHERE id = ? AND state = ?`)
    .run(...);
  return db.prepare('SELECT * FROM jobs WHERE id = ?').get(job.id);
});
return claim.immediate();
```

`.immediate()` forces SQLite to acquire a `RESERVED` write lock on the database
file the instant the transaction begins, before the `SELECT` even runs. SQLite's
locking is enforced at the OS file-lock level, so it works across separate
processes, not just separate threads or async calls within one process. If a
second `node` process tries to open its own `BEGIN IMMEDIATE` transaction while
the first is active, it blocks until the first commits. So the read-then-write
sequence can never interleave with another process's claim attempt.

Verified empirically: ran two separate `node` processes simultaneously, each
looping and calling `claimNextJob()` against 35 shared pending jobs. Worker A
claimed 20, Worker B claimed 15, zero overlap.

## 2. A worker is SIGKILL'ed halfway through a job. Walk through, step by step, what state the job is in and how it eventually runs again. What is the worst-case delay before recovery?

1. A worker claims a job — it becomes `processing`, `claimed_by` set, `heartbeat_at` set to now.
2. While the command runs, the worker updates `heartbeat_at` every 5 seconds via `setInterval`.
3. The worker is SIGKILL'ed. This cannot be caught. The process dies instantly;
   `heartbeat_at` stops updating and stays frozen. The job remains `processing` forever
   with nothing to change that on its own.
4. Any worker's normal loop runs a reaper check every 5 seconds, looking for
   `processing` jobs whose `heartbeat_at` is older than a 15-second staleness threshold.
5. The reaper resets the stale job back to `pending`, clearing `claimed_by`/`heartbeat_at`.
6. Any available worker claims it again through the normal atomic claim path.

Worst-case delay: staleness threshold (15s) + reaper check interval (5s) = roughly
20 seconds, well under the 60-second requirement. Verified directly by force-killing
a worker mid-job and watching a freshly started worker automatically recover and
complete it with no manual intervention.

## 3. Does `dlq retry` reset `attempts`? Why is that the right call?

Yes, `dlq retry <id>` resets `attempts` to 0. A manual retry is a human deciding
to give the job a full fresh chance, not to continue exactly where it left off.
Without resetting, a job that already exhausted its retries would be one failure
away from going straight back to `dead`, defeating the purpose of a manual retry.
Resetting to 0 gives it the full `max_retries` cycle again, same as a new job.

## 4. What designs did you consider and reject for `worker stop` (cross-process signaling), and why?

Initially implemented with `process.kill(pid, 'SIGTERM')`, the idiomatic POSIX
approach. Rejected for this project because Windows doesn't have real POSIX
signals — Node simulates SIGTERM there, but delivery is unreliable and can end
up forcefully terminating the process instead of triggering a graceful handler.

Used a stop-flag file instead: `worker start` writes a PID file; `worker stop`
writes a corresponding `.stop` file; the worker's loop checks for that flag on
every iteration, immediately before claiming its next job, and exits after
finishing any job currently in flight.

Also considered a control socket (listening TCP/Unix socket for stop messages),
rejected as unnecessary complexity for what's fundamentally a single one-shot
signal.

Verified under a mixed queue (one slow job plus several fast ones): sent
`worker stop` while the slow job was running, confirmed the worker finished
only that job and exited without claiming any of the fast jobs still queued.

## 5. If priorities were added tomorrow (high-priority jobs jump the queue), which parts of your design survive unchanged and which break?

Survives unchanged: the atomic claim transaction itself, retry/backoff/DLQ logic,
crash recovery (heartbeat + reaper), and worker stop signaling — all orthogonal
to job ordering.

Would need to change: the `SELECT` inside `claimNextJob()` currently orders by
`created_at ASC` (FIFO); adding priority means changing that to something like
`ORDER BY priority DESC, created_at ASC`. More importantly, a naive priority
implementation could starve low-priority jobs if high-priority jobs keep
arriving — the current design has no fairness/aging mechanism to prevent that,
and one would need to be added if starvation became a real concern.

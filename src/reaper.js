const db = require('./db');

const STALE_THRESHOLD_SEC = 15; // job is considered abandoned if no heartbeat in this window

function reapStaleJobs() {
  const now = new Date().toISOString();
  const cutoff = new Date(Date.now() - STALE_THRESHOLD_SEC * 1000).toISOString();

  const staleJobs = db.prepare(`
    SELECT id, claimed_pid FROM jobs
    WHERE state = 'processing'
      AND heartbeat_at < ?
  `).all(cutoff);

  const updateStmt = db.prepare(`
    UPDATE jobs
    SET state = 'pending',
        claimed_by = NULL,
        heartbeat_at = NULL,
        claimed_pid = NULL,
        updated_at = ?
    WHERE id = ?
  `);

  const tx = db.transaction(() => {
    for (const job of staleJobs) {
      if (job.claimed_pid) {
        try {
          process.kill(job.claimed_pid, 'SIGKILL');
        } catch (err) {
          // ignore if process is already dead or not found
        }
      }
      updateStmt.run(now, job.id);
    }
  });

  const result = tx();

  if (staleJobs.length > 0) {
    console.error(`  → reaper recovered ${staleJobs.length} stale job(s)`);
  }
}

module.exports = reapStaleJobs;

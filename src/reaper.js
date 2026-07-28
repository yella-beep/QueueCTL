const db = require('./db');

const STALE_THRESHOLD_SEC = 15; // job is considered abandoned if no heartbeat in this window

function reapStaleJobs() {
  const cutoff = new Date(Date.now() - STALE_THRESHOLD_SEC * 1000).toISOString();

  const result = db.prepare(`
    UPDATE jobs
    SET state = 'pending', claimed_by = NULL, heartbeat_at = NULL, updated_at = ?
    WHERE state = 'processing' AND heartbeat_at < ?
  `).run(new Date().toISOString(), cutoff);

  if (result.changes > 0) {
    console.error(`  → reaper recovered ${result.changes} stale job(s)`);
  }
}

module.exports = reapStaleJobs;

const db = require('./db');
const { getConfig } = require('./config');

function markCompleted(id) {
  db.prepare(`
    UPDATE jobs
    SET state = 'completed', claimed_by = NULL, heartbeat_at = NULL, updated_at = ?
    WHERE id = ?
  `).run(new Date().toISOString(), id);
}

function markFailedOrDead(job) {
  const attempts = job.attempts + 1;
  const maxRetries = job.max_retries ?? getConfig('max-retries');
  const now = new Date().toISOString();

  if (attempts >= maxRetries) {
    db.prepare(`
      UPDATE jobs
      SET state = 'dead', attempts = ?, claimed_by = NULL, heartbeat_at = NULL,
          next_retry_at = NULL, updated_at = ?
      WHERE id = ?
    `).run(attempts, now, job.id);

    console.error(`  → job ${job.id} moved to DLQ after ${attempts} attempts`);
  } else {
    const base = getConfig('backoff-base');
    const delaySec = Math.pow(base, attempts);
    const nextRetryAt = new Date(Date.now() + delaySec * 1000).toISOString();

    db.prepare(`
      UPDATE jobs
      SET state = 'failed', attempts = ?, claimed_by = NULL, heartbeat_at = NULL,
          next_retry_at = ?, updated_at = ?
      WHERE id = ?
    `).run(attempts, nextRetryAt, now, job.id);

    console.error(`  → job ${job.id} failed (attempt ${attempts}/${maxRetries}), retry in ${delaySec}s`);
  }
}

module.exports = { markCompleted, markFailedOrDead };

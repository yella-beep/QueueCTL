const db = require('./src/db');

function claimNextJob(workerId) {
  const claim = db.transaction(() => {
    const job = db.prepare(`
      SELECT * FROM jobs
      WHERE state = 'pending'
         OR (state = 'failed' AND next_retry_at <= ?)
      ORDER BY created_at ASC
      LIMIT 1
    `).get(new Date().toISOString());

    if (!job) return null;

    db.prepare(`
      UPDATE jobs
      SET state = 'processing', claimed_by = ?, heartbeat_at = ?, updated_at = ?
      WHERE id = ? AND state = ?
    `).run(workerId, new Date().toISOString(), new Date().toISOString(), job.id, job.state);

    return job;
  });

  return claim.immediate();
}

module.exports = claimNextJob;

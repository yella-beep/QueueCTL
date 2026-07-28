const db = require('./db');

function markCompleted(id) {
  db.prepare(`UPDATE jobs SET state = 'completed', claimed_by = NULL, updated_at = ? WHERE id = ?`)
    .run(new Date().toISOString(), id);
}

function markFailedOrDead(job) {
  // temporary simple version — real retry/backoff logic comes in Phase 5
  db.prepare(`UPDATE jobs SET state = 'dead', claimed_by = NULL, updated_at = ? WHERE id = ?`)
    .run(new Date().toISOString(), job.id);
}

module.exports = { markCompleted, markFailedOrDead };

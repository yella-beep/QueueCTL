const db = require('../db');

function dlqListCommand(jsonFlag) {
  const rows = db.prepare("SELECT * FROM jobs WHERE state = 'dead'").all();

  if (jsonFlag) {
    console.log(JSON.stringify(rows));
  } else {
    if (rows.length === 0) {
      console.log('DLQ is empty');
    } else {
      rows.forEach(r => console.log(`${r.id}  attempts=${r.attempts}  ${r.command}`));
    }
  }
}

function dlqRetryCommand(id) {
  const job = db.prepare("SELECT * FROM jobs WHERE id = ?").get(id);

  if (!job) {
    console.error(`Error: no job found with id ${id}`);
    process.exit(1);
  }

  if (job.state !== 'dead') {
    console.error(`Error: job ${id} is not in the DLQ (current state: ${job.state})`);
    process.exit(1);
  }

  // Reset attempts to 0 — a manual retry is a fresh start, and not resetting
  // would send it straight back to dead on the very next failure with no
  // real retry cycle. See DECISIONS.md for the full reasoning.
  db.prepare(`
    UPDATE jobs
    SET state = 'pending', attempts = 0, claimed_by = NULL,
        heartbeat_at = NULL, next_retry_at = NULL, updated_at = ?
    WHERE id = ?
  `).run(new Date().toISOString(), id);

  console.error(`Job ${id} re-enqueued (attempts reset to 0)`);
}

module.exports = { dlqListCommand, dlqRetryCommand };

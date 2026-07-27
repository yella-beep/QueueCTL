const fs = require('fs');
const db = require('../db');

function enqueueCommand(input, options = {}) {
  let jsonString;

  if (options.file) {
    jsonString = fs.readFileSync(options.file, 'utf8');
  } else {
    jsonString = input;
  }

  let job;
  try {
    job = JSON.parse(jsonString);
  } catch (err) {
    console.error('Error: invalid JSON');
    process.exit(1);
  }

  if (!job.id || !job.command) {
    console.error('Error: job must have "id" and "command"');
    process.exit(1);
  }

  const now = new Date().toISOString();

  db.prepare(`
    INSERT INTO jobs (id, command, state, attempts, max_retries, created_at, updated_at)
    VALUES (?, ?, 'pending', 0, ?, ?, ?)
  `).run(
    job.id,
    job.command,
    job.max_retries ?? 3,
    now,
    now
  );

  console.error(`Job ${job.id} enqueued.`);
}

module.exports = enqueueCommand;
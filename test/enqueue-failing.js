const db = require('../src/db');
const now = new Date().toISOString();

db.prepare(`
  INSERT OR IGNORE INTO jobs (id, command, state, attempts, max_retries, created_at, updated_at)
  VALUES ('fail1', 'exit 1', 'pending', 0, 3, ?, ?)
`).run(now, now);

console.log('failing job enqueued');

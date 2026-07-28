const db = require('../src/db');
const now = new Date().toISOString();
db.prepare(`
  INSERT OR IGNORE INTO jobs (id, command, state, attempts, max_retries, created_at, updated_at)
  VALUES ('slow1', 'ping 127.0.0.1 -n 6 > nul', 'pending', 0, 3, ?, ?)
`).run(now, now);
console.log('slow job enqueued');

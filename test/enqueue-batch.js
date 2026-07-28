const db = require('../src/db');
const now = new Date().toISOString();

for (let i = 2; i <= 5; i++) {
  db.prepare(`
    INSERT OR IGNORE INTO jobs (id, command, state, attempts, max_retries, created_at, updated_at)
    VALUES (?, ?, 'pending', 0, 3, ?, ?)
  `).run(`job${i}`, 'echo hi', now, now);
}

console.log('jobs 2-5 enqueued');

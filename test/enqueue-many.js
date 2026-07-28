const db = require('./src/db');
const now = new Date().toISOString();

for (let i = 1; i <= 30; i++) {
  db.prepare(`
    INSERT OR IGNORE INTO jobs (id, command, state, attempts, max_retries, created_at, updated_at)
    VALUES (?, ?, 'pending', 0, 3, ?, ?)
  `).run(`race${i}`, 'echo hi', now, now);
}
console.log('30 race jobs enqueued');

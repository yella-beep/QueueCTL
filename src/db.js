const path = require('path');
const Database = require('better-sqlite3');
const db = new Database(path.join(__dirname, '..', 'queuectl.db'));

db.pragma('journal_mode = WAL'); // lets readers not block on a writer

db.exec(`
  CREATE TABLE IF NOT EXISTS jobs (
    id TEXT PRIMARY KEY,
    command TEXT NOT NULL,
    state TEXT NOT NULL DEFAULT 'pending',
    attempts INTEGER NOT NULL DEFAULT 0,
    max_retries INTEGER NOT NULL DEFAULT 3,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    next_retry_at TEXT,        -- when a 'failed' job becomes eligible again
    claimed_by TEXT,           -- worker id/pid that owns it while 'processing'
    heartbeat_at TEXT,         -- last time the owning worker proved it's alive
    claimed_pid INTEGER        -- OS PID of the spawned child process for orphan cleanup
  );

  CREATE TABLE IF NOT EXISTS config (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );
`);

// Add a close method to explicitly close the database
db.closeDb = function() {
  this.close();
};

module.exports = db;
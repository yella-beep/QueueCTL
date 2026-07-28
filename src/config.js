const db = require('./db');

const DEFAULTS = {
  'backoff-base': 2,
  'max-retries': 3,
};

function getConfig(key) {
  const row = db.prepare('SELECT value FROM config WHERE key = ?').get(key);
  if (row) return Number(row.value);
  return DEFAULTS[key];
}

function setConfig(key, value) {
  db.prepare(`
    INSERT INTO config (key, value) VALUES (?, ?)
    ON CONFLICT(key) DO UPDATE SET value = excluded.value
  `).run(key, String(value));
}

module.exports = { getConfig, setConfig };

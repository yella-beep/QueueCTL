const fs = require('fs');
const db = require('../db');

function tryParseRelaxedJson(str) {
  let cleaned = str.trim();
  if (cleaned.startsWith("'") && cleaned.endsWith("'")) {
    cleaned = cleaned.slice(1, -1).trim();
  }
  if (cleaned.startsWith("{") && cleaned.endsWith("}")) {
    cleaned = cleaned.slice(1, -1).trim();
  } else {
    return null;
  }

  const keys = ['id', 'command', 'max_retries', 'max-retries'];
  const pos = [];
  for (const key of keys) {
    const idx = cleaned.indexOf(key + ':');
    if (idx !== -1) {
      pos.push({ key, index: idx });
    }
  }
  pos.sort((a, b) => a.index - b.index);

  if (pos.length === 0) return null;

  const result = {};
  for (let i = 0; i < pos.length; i++) {
    const start = pos[i].index + pos[i].key.length + 1;
    const end = (i + 1 < pos.length) ? pos[i+1].index : cleaned.length;
    let val = cleaned.slice(start, end).trim();
    if (val.endsWith(',')) {
      val = val.slice(0, -1).trim();
    }
    // Remove surrounding quotes if they survived (e.g. from partial shell parsing)
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    let key = pos[i].key;
    if (key === 'max-retries') key = 'max_retries';
    result[key] = val;
  }
  return result;
}

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
    job = tryParseRelaxedJson(jsonString);
    if (!job) {
      console.error('Error: invalid JSON');
      process.exit(1);
    }
  }

  if (!job.id || !job.command) {
    console.error('Error: job must have "id" and "command"');
    process.exit(1);
  }

  let maxRetriesVal = job.max_retries;
  if (maxRetriesVal !== undefined) {
    maxRetriesVal = parseInt(maxRetriesVal, 10);
    if (isNaN(maxRetriesVal)) {
      maxRetriesVal = undefined;
    }
  }

  const now = new Date().toISOString();
  const { getConfig } = require('../config');

  try {
    db.prepare(`
      INSERT INTO jobs (id, command, state, attempts, max_retries, created_at, updated_at)
      VALUES (?, ?, 'pending', 0, ?, ?, ?)
    `).run(
      job.id,
      job.command,
      maxRetriesVal ?? getConfig('max-retries'),
      now,
      now
    );
  } catch (err) {
    if (err.code === 'SQLITE_CONSTRAINT_PRIMARYKEY' || err.message.includes('UNIQUE constraint failed')) {
      console.error(`Error: job with ID "${job.id}" already exists`);
      process.exit(1);
    }
    throw err;
  }

  console.error(`Job ${job.id} enqueued.`);
}

module.exports = enqueueCommand;
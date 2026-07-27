const db = require('../db');

function listCommand(state, jsonFlag) {
  const rows = state
    ? db.prepare('SELECT * FROM jobs WHERE state = ?').all(state)
    : db.prepare('SELECT * FROM jobs').all();

  if (jsonFlag) {
    // stdout must contain ONLY the JSON array — nothing else
    console.log(JSON.stringify(rows));
  } else {
    rows.forEach(r => console.log(`${r.id}  [${r.state}]  ${r.command}`));
  }
}

module.exports = listCommand;
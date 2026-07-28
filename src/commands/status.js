const db = require('../db');
const fs = require('fs');
const path = require('path');

const pidDir = path.join(__dirname, '..', '..', '.queuectl');

function isPidAlive(pid) {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

function statusCommand() {
  const counts = db.prepare(`
    SELECT state, COUNT(*) as count FROM jobs GROUP BY state
  `).all();

  console.log('Job states:');
  const stateMap = { pending: 0, processing: 0, completed: 0, failed: 0, dead: 0 };
  counts.forEach(row => { stateMap[row.state] = row.count; });
  Object.entries(stateMap).forEach(([state, count]) => {
    console.log(`  ${state}: ${count}`);
  });

  let activeWorkers = 0;
  if (fs.existsSync(pidDir)) {
    const files = fs.readdirSync(pidDir);
    const pidFiles = files.filter(f => f.endsWith('.pid'));
    for (const file of pidFiles) {
      const pidPath = path.join(pidDir, file);
      const pidStr = fs.readFileSync(pidPath, 'utf8');
      const pid = parseInt(pidStr, 10);
      if (isPidAlive(pid)) {
        activeWorkers++;
      } else {
        fs.unlinkSync(pidPath);
        const stopFile = pidPath + '.stop';
        if (fs.existsSync(stopFile)) {
          fs.unlinkSync(stopFile);
        }
      }
    }
  }
  console.log(`Active workers: ${activeWorkers}`);
}

module.exports = statusCommand;

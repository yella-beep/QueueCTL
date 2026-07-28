const { spawn } = require('child_process');
const claimNextJob = require('./claim');
const db = require('./db');
const markCompleted = require('./jobLifecycle').markCompleted;
const markFailedOrDead = require('./jobLifecycle').markFailedOrDead;
const reapStaleJobs = require('./reaper');

const POLL_INTERVAL_MS = 500;
const HEARTBEAT_INTERVAL_MS = 5000;
const REAPER_CHECK_INTERVAL_MS = 5000;

let shuttingDown = false;

process.on('SIGTERM', () => { shuttingDown = true; });
process.on('SIGINT', () => { shuttingDown = true; });

function touchHeartbeat(jobId) {
  db.prepare(`UPDATE jobs SET heartbeat_at = ? WHERE id = ?`)
    .run(new Date().toISOString(), jobId);
}

function runJob(job) {
  return new Promise((resolve) => {
    const child = spawn(job.command, { shell: true, stdio: 'ignore', detached: true });
    child.unref();

    const hbInterval = setInterval(() => touchHeartbeat(job.id), HEARTBEAT_INTERVAL_MS);

    child.on('exit', (code) => {
      clearInterval(hbInterval);
      resolve(code === 0);
    });

    child.on('error', () => {
      clearInterval(hbInterval);
      resolve(false);
    });
  });
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function runWorker(workerId) {
  console.error(`${workerId} started`);

  let lastReapCheck = 0;

  while (!shuttingDown) {
    if (Date.now() - lastReapCheck > REAPER_CHECK_INTERVAL_MS) {
      reapStaleJobs();
      lastReapCheck = Date.now();
    }

    const job = claimNextJob(workerId);

    if (!job) {
      await sleep(POLL_INTERVAL_MS);
      continue;
    }

    console.error(`${workerId} running job ${job.id}`);
    const success = await runJob(job);

    if (success) {
      markCompleted(job.id);
    } else {
      markFailedOrDead(job);
    }
  }

  console.error(`${workerId} shut down gracefully`);
}

module.exports = runWorker;

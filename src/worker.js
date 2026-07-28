const { spawn } = require('child_process');
const claimNextJob = require('./claim');
const db = require('./db');
const markCompleted = require('./jobLifecycle').markCompleted;
const markFailedOrDead = require('./jobLifecycle').markFailedOrDead;

const POLL_INTERVAL_MS = 500;

let shuttingDown = false;

process.on('SIGTERM', () => { shuttingDown = true; });
process.on('SIGINT', () => { shuttingDown = true; });

function runJob(job) {
  return new Promise((resolve) => {
    const child = spawn(job.command, { shell: true, stdio: 'ignore', detached: true });
    child.unref();

    child.on('exit', (code) => {
      resolve(code === 0);
    });

    child.on('error', () => {
      resolve(false);
    });
  });
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function runWorker(workerId) {
  console.error(`${workerId} started`);

  while (!shuttingDown) {
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

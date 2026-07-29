const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const claimNextJob = require('./claim');
const db = require('./db');
const markCompleted = require('./jobLifecycle').markCompleted;
const markFailedOrDead = require('./jobLifecycle').markFailedOrDead;
const reapStaleJobs = require('./reaper');

const pidDir = path.join(__dirname, '..', '.queuectl');
const pidFilePath = (workerId) => path.join(pidDir, `${workerId}.pid`);

function writePidFile(workerId) {
  if (!fs.existsSync(pidDir)) {
    fs.mkdirSync(pidDir, { recursive: true });
  }
  fs.writeFileSync(pidFilePath(workerId), String(process.pid));
}

function removePidFile(workerId) {
  try {
    fs.unlinkSync(pidFilePath(workerId));
  } catch (err) {
    // already gone, fine
  }
}

const POLL_INTERVAL_MS = 500;
const HEARTBEAT_INTERVAL_MS = 5000;
const REAPER_CHECK_INTERVAL_MS = 5000;

let shuttingDown = false;
let currentWorkerId = null;

process.on('SIGTERM', () => { shuttingDown = true; });
process.on('SIGINT', () => { shuttingDown = true; });
process.on('exit', () => { if (currentWorkerId) removePidFile(currentWorkerId); });

function touchHeartbeat(jobId) {
  db.prepare(`UPDATE jobs SET heartbeat_at = ? WHERE id = ?`)
    .run(new Date().toISOString(), jobId);
}

function runJob(job) {
  return new Promise((resolve) => {
    // Note: detached: true is intentionally removed since OS cleanup is better where available,
    // but we still explicitly kill orphaned processes via claimed_pid in the reaper.
    const child = spawn(job.command, { shell: true, stdio: 'ignore' });
    
    db.prepare(`UPDATE jobs SET claimed_pid = ? WHERE id = ?`).run(child.pid, job.id);

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
  currentWorkerId = workerId;
  writePidFile(workerId);
  console.error(`${workerId} started (pid ${process.pid})`);

  let lastReapCheck = 0;
  const stopFilePath = path.join(pidDir, `${workerId}.pid.stop`);

  while (!shuttingDown) {
    if (Date.now() - lastReapCheck > REAPER_CHECK_INTERVAL_MS) {
      reapStaleJobs();
      lastReapCheck = Date.now();
    }

    // Check for stop flag file immediately before claiming next job
    if (fs.existsSync(stopFilePath)) {
      fs.unlinkSync(stopFilePath);
      console.error(`${workerId} detected stop flag, shutting down`);
      shuttingDown = true;
      break;
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
      console.error(`  → job ${job.id} completed successfully`);
    } else {
      markFailedOrDead(job);
    }
  }

  removePidFile(workerId);
  console.error(`${workerId} shut down gracefully`);
}

module.exports = runWorker;

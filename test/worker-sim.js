const claimNextJob = require('../src/claim');

const workerId = process.argv[2] || 'worker-x';
const claimed = [];

async function run() {
  for (let i = 0; i < 50; i++) {
    const job = claimNextJob(workerId);
    if (job) claimed.push(job.id);
    // Small delay to allow other workers to interleave
    await new Promise(resolve => setTimeout(resolve, 1));
  }
  console.log(`${workerId} claimed:`, claimed);
}

run();

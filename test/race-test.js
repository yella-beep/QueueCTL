const claimNextJob = require('./src/claim');

const claimed = [];
for (let i = 0; i < 10; i++) {
  const job = claimNextJob(`worker-${i % 2}`);
  if (job) claimed.push(job.id);
}

console.log('Claimed:', claimed);
console.log('Unique claims:', new Set(claimed).size, '/', claimed.length);

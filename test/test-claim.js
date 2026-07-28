const claimNextJob = require('./claim-temp');

const job = claimNextJob('test-worker-1');
console.log(job);

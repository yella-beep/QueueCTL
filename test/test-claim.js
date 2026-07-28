const claimNextJob = require('../src/claim');

const job = claimNextJob('test-worker-1');
console.log(job);

const runWorker = require('../src/worker');

// Run worker for 10 seconds then exit
setTimeout(() => {
  process.exit(0);
}, 10000);

runWorker('test-worker');

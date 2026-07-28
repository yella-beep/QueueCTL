const runWorker = require('../src/worker');

// Run worker for 15 seconds then exit (to allow retry delays)
setTimeout(() => {
  process.exit(0);
}, 15000);

runWorker('test-worker');

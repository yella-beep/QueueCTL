const runWorker = require('../src/worker');

console.log('Starting worker for crash test...');
console.log('Once you see "running job slow5", kill this process with: Stop-Process -Id', process.pid, '-Force');

runWorker('test-worker');

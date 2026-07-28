const { spawn } = require('child_process');

let outputA = '';
let outputB = '';
let doneA = false;
let doneB = false;

const workerA = spawn('node', ['worker-sim.js', 'A']);
const workerB = spawn('node', ['worker-sim.js', 'B']);

workerA.stdout.on('data', (data) => {
  outputA += data.toString();
});

workerB.stdout.on('data', (data) => {
  outputB += data.toString();
});

workerA.on('close', () => {
  doneA = true;
  if (doneB) {
    console.log('Worker A output:', outputA.trim());
    console.log('Worker B output:', outputB.trim());
  }
});

workerB.on('close', () => {
  doneB = true;
  if (doneA) {
    console.log('Worker A output:', outputA.trim());
    console.log('Worker B output:', outputB.trim());
  }
});

const fs = require('fs');
const path = require('path');

const pidDir = path.join(__dirname, '..', '.queuectl');

function stopAllWorkers() {
  if (!fs.existsSync(pidDir)) {
    console.error('No running workers found');
    return;
  }

  const files = fs.readdirSync(pidDir).filter(f => f.endsWith('.pid'));

  if (files.length === 0) {
    console.error('No running workers found');
    return;
  }

  for (const file of files) {
    const pid = parseInt(fs.readFileSync(path.join(pidDir, file), 'utf8'), 10);
    const filePath = path.join(pidDir, file);
    const stopFilePath = path.join(pidDir, `${file}.stop`);
    
    try {
      // Create a stop flag file that the worker will check
      fs.writeFileSync(stopFilePath, 'stop');
      console.error(`Signaled worker (pid ${pid}) to stop`);
    } catch (err) {
      console.error(`Failed to signal pid ${pid}: ${err.message}`);
    }
  }
}

module.exports = { stopAllWorkers };

const fs = require('fs');
const content = fs.readFileSync('bin/queuectl.js', 'utf8');
const newContent = content.replace('  });\n\nconst dlq = new Command', '  });\n\nprogram\n  .command("status")\n  .action(statusCommand);\n\nconst dlq = new Command');
fs.writeFileSync('bin/queuectl.js', newContent);
console.log('Done');

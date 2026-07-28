const db = require('./src/db');

db.prepare("UPDATE jobs SET state = 'pending', claimed_by = NULL WHERE id = 'job1'").run();

console.log('job1 reset to pending');

const db = require('./src/db');
db.prepare("UPDATE jobs SET state = 'pending', claimed_by = NULL, heartbeat_at = NULL").run();
console.log('all jobs reset to pending');

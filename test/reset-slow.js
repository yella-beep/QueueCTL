const db = require('../src/db');
db.prepare("UPDATE jobs SET state = 'pending', claimed_by = NULL, heartbeat_at = NULL WHERE id = 'slow1'").run();
console.log('slow1 reset to pending');

const db = require('../src/db');
db.prepare("DELETE FROM jobs").run();
console.log('All jobs deleted from database (clean slate).');

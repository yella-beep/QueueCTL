const db = require('./src/db');
console.log(db.prepare("SELECT * FROM jobs WHERE id = 'job1'").get());

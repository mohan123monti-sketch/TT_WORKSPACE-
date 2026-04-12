const db = require('better-sqlite3')('techturf.db');
const users = db.prepare("SELECT name, role FROM users WHERE name LIKE 'MOHAN%'").all();
console.log(users);
db.close();

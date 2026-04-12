const Database = require('better-sqlite3');
const db = new Database('./techturf.db');
const columns = db.prepare("PRAGMA table_info(submissions)").all();
columns.slice(0, 5).forEach(c => console.log(c.name));
db.close();

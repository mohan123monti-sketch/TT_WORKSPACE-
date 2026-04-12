const Database = require('better-sqlite3');
const path = require('path');
const dbPath = path.join(__dirname, '../techturf.db');
const db = new Database(dbPath);

try {
    const info = db.prepare("PRAGMA table_info(submissions)").all();
    console.log(JSON.stringify(info, null, 2));
} catch (err) {
    console.error("Error:", err.message);
}
db.close();

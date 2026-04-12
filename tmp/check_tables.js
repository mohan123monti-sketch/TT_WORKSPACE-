const Database = require('better-sqlite3');
const path = require('path');
const dbPath = path.join(__dirname, '../techturf.db');
const db = new Database(dbPath);

try {
    const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
    console.log('--- TABLES ---');
    console.table(tables);
} catch (err) {
    console.error("Error:", err.message);
}
db.close();

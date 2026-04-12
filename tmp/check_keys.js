const Database = require('better-sqlite3');
const path = require('path');
const dbPath = path.join(__dirname, '../techturf.db');
const db = new Database(dbPath);

try {
    const clients = db.prepare("SELECT id, name, company, project_key FROM clients").all();
    console.log(JSON.stringify(clients, null, 2));
} catch (err) {
    console.error("Error:", err.message);
}
db.close();

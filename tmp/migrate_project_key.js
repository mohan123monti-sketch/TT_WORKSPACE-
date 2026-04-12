const Database = require('better-sqlite3');
const path = require('path');
const dbPath = path.join(__dirname, '../techturf.db');
const db = new Database(dbPath);

try {
    db.exec("ALTER TABLE clients ADD COLUMN project_key TEXT;");
    console.log("Column project_key added successfully.");
} catch (err) {
    if (err.message.includes("duplicate column name")) {
        console.log("Column project_key already exists.");
    } else {
        console.error("Error adding column:", err.message);
    }
}
db.close();

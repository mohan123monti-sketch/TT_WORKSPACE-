const Database = require('better-sqlite3');
const path = require('path');
const dbPath = path.join(__dirname, '../techturf.db');
const db = new Database(dbPath);

const token = "Keyred007";

try {
    console.log("Searching for token:", token);
    const client = db.prepare('SELECT id, name, company, project_key FROM clients WHERE project_key=? COLLATE NOCASE').get(token.trim());

    if (client) {
        console.log("MATCH FOUND!");
        console.log(client);
    } else {
        console.log("NO MATCH FOUND.");
        // Try fuzzy check
        const all = db.prepare('SELECT id, project_key FROM clients').all();
        all.forEach(c => {
            if (c.project_key) {
                console.log(`Comparing "${token.trim()}" with "${c.project_key}"`);
                console.log(`Length: ${token.trim().length} vs ${c.project_key.length}`);
                if (c.project_key.toLowerCase() === token.trim().toLowerCase()) {
                    console.log("They should match!");
                }
            }
        });
    }
} catch (err) {
    console.error("Error:", err.message);
}
db.close();

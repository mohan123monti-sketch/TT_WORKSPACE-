const Database = require('better-sqlite3');
const bcrypt = require('bcryptjs');
const path = require('path');

const dbPath = path.join(__dirname, 'storage', 'techturf.db');
const db = new Database(dbPath);

const name = 'Aadil Jm';
const email = 'aadiljm2007@gmail.com';
const password = 'Aadhil@techturf.002#TH';
const role = 'frontend_backend';

(async () => {
    const hash = await bcrypt.hash(password, 10);
    try {
        db.prepare(`INSERT INTO users (name, email, password, role, employment_status, is_active) VALUES (?, ?, ?, ?, ?, 1)`).run(
            name, email, hash, role, 'active'
        );
        console.log('User created successfully:', email);
    } catch (e) {
        console.error('Error:', e.message);
    }
    db.close();
})();

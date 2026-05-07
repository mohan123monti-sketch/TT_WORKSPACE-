// Run this script with: node create_admin.js
const Database = require('better-sqlite3');
const bcrypt = require('bcryptjs');
const path = require('path');

const dbPath = path.join(__dirname, 'storage', 'techturf.db');
const db = new Database(dbPath);

const name = 'Admin';
const email = 'admin@techturf.com';
const password = 'Admin@12345'; // Change after first login!
const role = 'admin';
const employment_status = 'active';

(async () => {
  const hash = await bcrypt.hash(password, 10);
  try {
    db.prepare(`INSERT INTO users (name, email, password, role, employment_status, is_active) VALUES (?, ?, ?, ?, ?, 1)`).run(
      name, email, hash, role, employment_status
    );
    console.log('Admin user created:');
    console.log('Email:', email);
    console.log('Password:', password);
  } catch (e) {
    if (e.message.includes('UNIQUE')) {
      console.log('Admin user already exists.');
    } else {
      console.error('Error creating admin user:', e.message);
    }
  }
  db.close();
})();

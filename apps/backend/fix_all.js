const db = require('better-sqlite3')('../techturf.db');

// 1. Add secondary_roles to users
try {
  db.prepare('ALTER TABLE users ADD COLUMN secondary_roles TEXT DEFAULT ""').run();
  console.log('+ Added secondary_roles to users');
} catch(e) { console.log('  secondary_roles already exists'); }

// 2. Add created_at to projects
try {
  db.prepare('ALTER TABLE projects ADD COLUMN created_at DATETIME DEFAULT CURRENT_TIMESTAMP').run();
  console.log('+ Added created_at to projects');
  // Backfill from updated_at
  db.prepare('UPDATE projects SET created_at = updated_at WHERE created_at IS NULL').run();
  console.log('  Backfilled created_at from updated_at');
} catch(e) { console.log('  created_at already exists on projects'); }

// 3. Add submitted_at alias - actually just add the column
try {
  db.prepare('ALTER TABLE submissions ADD COLUMN submitted_at DATETIME DEFAULT CURRENT_TIMESTAMP').run();
  console.log('+ Added submitted_at to submissions');
  // Backfill from created_at
  db.prepare('UPDATE submissions SET submitted_at = created_at WHERE submitted_at IS NULL').run();
  console.log('  Backfilled submitted_at from created_at');
} catch(e) { console.log('  submitted_at already exists on submissions'); }

// 4. Create announcements table
try {
  db.exec(`
    CREATE TABLE IF NOT EXISTS announcements (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      content TEXT,
      priority TEXT DEFAULT 'normal' CHECK(priority IN ('urgent','normal','low')),
      created_by INTEGER REFERENCES users(id),
      is_pinned INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS idx_announcements_created_by ON announcements(created_by);
  `);
  console.log('+ Created announcements table');
} catch(e) { console.log('  announcements table issue:', e.message); }

console.log('\nAll migrations complete!');

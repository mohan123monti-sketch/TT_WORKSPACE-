const db = require('better-sqlite3')('../../techturf.db');
try {
  console.log('logins:', db.prepare("SELECT COUNT(*) as count FROM login_log WHERE login_at >= date('now', '-30 days')").get().count);
} catch(e) {
  console.error('ERROR:', e.message);
}

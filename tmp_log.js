const db = require('./server/db');
try {
    let logs = db.prepare("SELECT * FROM audit_log WHERE table_name='projects' ORDER BY created_at DESC LIMIT 5").all();
    console.log(JSON.stringify(logs, null, 2));
} catch (e) { console.error(e); }

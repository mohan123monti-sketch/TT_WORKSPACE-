const db = require('better-sqlite3')('C:/Users/HP/Downloads/TT_WORKSPACE-/shared/storage/techturf.db');
const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
for(const t of tables){
  const c = db.prepare("SELECT COUNT(*) as c FROM " + t.name).get().c;
  if (c > 0) console.log(t.name, c);
}

const Database = require('better-sqlite3');
const files = [
  'C:\\Users\\HP\\Downloads\\New folder\\TT_WORKSPACE-\\techturf.db',
  'C:\\Users\\HP\\Downloads\\New folder\\TT_WORKSPACE-\\project\\techturf.db',
  'C:\\Users\\HP\\Downloads\\temp2\\temp2\\project\\storage\\techturf.db',
  'C:\\Users\\HP\\Downloads\\TECH-TURF-OFFICIAL-WEBSITE-\\backend\\database\\database.sqlite'
];

for (const f of files) {
  try {
    const db = new Database(f, { fileMustExist: true });
    const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
    let totalRows = 0;
    const tableCounts = {};
    for (const t of tables) {
       const c = db.prepare('SELECT COUNT(*) as c FROM ' + t.name).get().c;
       if (c > 0 && t.name !== 'sqlite_sequence') {
          tableCounts[t.name] = c;
          totalRows += c;
       }
    }
    console.log(`[${f}] Total populated rows: ${totalRows}. Tables:`, JSON.stringify(tableCounts));
  } catch(e) {
    console.log(`[${f}] Error: ${e.message}`);
  }
}

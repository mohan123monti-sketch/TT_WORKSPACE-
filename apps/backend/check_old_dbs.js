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
    // Check if projects table exists
    const hasProjects = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='projects'").get();
    if (hasProjects) {
       const c = db.prepare('SELECT COUNT(*) as c FROM projects').get().c;
       console.log(`[${f}] Projects count: ${c}`);
    } else {
       console.log(`[${f}] No projects table found.`);
    }
    
    // Also check invoices (if it's the old TT_INOVNIX db)
    const hasInvoices = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='invoices'").get();
    if (hasInvoices) {
       const c = db.prepare('SELECT COUNT(*) as c FROM invoices').get().c;
       console.log(`[${f}] Invoices count: ${c}`);
    }
  } catch(e) {
    console.log(`[${f}] Error: ${e.message}`);
  }
}

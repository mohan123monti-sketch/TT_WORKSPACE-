const db = require('./db');
const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'").all();
const data = {};
for (const table of tables) {
  const count = db.prepare(`SELECT COUNT(*) as count FROM ${table.name}`).get().count;
  data[table.name] = count;
}
console.log(JSON.stringify(data, null, 2));

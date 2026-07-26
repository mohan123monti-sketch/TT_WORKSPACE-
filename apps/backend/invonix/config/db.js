import path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
// Use the better-sqlite3 package from the workspace root
const Database = require('better-sqlite3');

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = path.resolve(__dirname, '../../../../shared/storage/techturf.db');

console.log(`[TT_INOVNIX] Connecting to shared SQLite DB at: ${dbPath}`);
const sqliteDb = new Database(dbPath);

// Polyfill for MySQL query signature
export const db = {
  async query(sql, params = []) {
    // Basic conversion of some MySQL syntax to SQLite if necessary
    // But standard queries (SELECT * FROM table WHERE col = ?) work in both.
    const isSelect = sql.trim().toUpperCase().startsWith('SELECT');
    
    try {
      const stmt = sqliteDb.prepare(sql);
      if (isSelect) {
        const rows = stmt.all(...params);
        return [rows, []];
      } else {
        const result = stmt.run(...params);
        return [{
          insertId: result.lastInsertRowid,
          affectedRows: result.changes
        }, []];
      }
    } catch (err) {
      console.error("[DB Query Error] SQL:", sql, "Params:", params, "Err:", err.message);
      throw err;
    }
  },
  
  async getConnection() {
    return {
      async query(sql, params) {
        return db.query(sql, params);
      },
      async beginTransaction() {
        sqliteDb.exec('BEGIN TRANSACTION');
      },
      async commit() {
        sqliteDb.exec('COMMIT');
      },
      async rollback() {
        sqliteDb.exec('ROLLBACK');
      },
      release() {} // no-op
    };
  }
};

export const pool = db;

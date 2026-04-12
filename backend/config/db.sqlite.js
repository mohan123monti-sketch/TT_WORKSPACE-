import sqlite3 from 'sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DB_PATH = path.join(__dirname, '..', 'database.sqlite');

let pool = null;

// Mock pool to maintain similar interface to pg Pool
class SqlitePool {
    constructor() {
        this.connection = new sqlite3.Database(DB_PATH, (err) => {
            if (err) {
                console.error('[SQLITE] Connection error:', err.message);
            } else {
                console.log('[SQLITE] Connected to SQLite database');
            }
        });

        // Enable foreign keys
        this.connection.run('PRAGMA foreign_keys = ON');
    }

    async query(text, params = []) {
        // Convert PostgreSQL style parameters ($1, $2) to SQLite style (?)
        const sqliteText = text.replace(/\$\d+/g, '?');

        return new Promise((resolve, reject) => {
            const isSelect = sqliteText.trim().toUpperCase().startsWith('SELECT');

            if (isSelect) {
                this.connection.all(sqliteText, params, (err, rows) => {
                    if (err) {
                        reject(err);
                    } else {
                        resolve({ rows, rowCount: rows.length });
                    }
                });
            } else {
                this.connection.run(sqliteText, params, function (err) {
                    if (err) {
                        reject(err);
                    } else {
                        // Provide consistent response structure
                        resolve({
                            rows: [],
                            rowCount: this.changes,
                            lastID: this.lastID
                        });
                    }
                });
            }
        });
    }

    close() {
        this.connection.close();
    }
}

// Singleton pool instance
export const getPool = () => {
    if (!pool) {
        pool = new SqlitePool();
    }
    return pool;
};

export const query = async (text, params = []) => {
    return getPool().query(text, params);
};

export const testConnection = async () => {
    try {
        await query('SELECT 1');
        return true;
    } catch (err) {
        console.error('[SQLITE] Health check failed:', err.message);
        throw err;
    }
};

export default {
    query,
    testConnection,
    getPool
};

import pg from 'pg';
import * as sqlite from './db.sqlite.js';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;
const dbType = (process.env.DB_TYPE || 'postgresql').toLowerCase();

let poolInstance = null;
let queryFn = null;
let testConnFn = null;

if (dbType === 'sqlite') {
    console.log('[DB] Using SQLITE');
    poolInstance = sqlite.getPool();
    queryFn = sqlite.query;
    testConnFn = sqlite.testConnection;
} else {
    console.log('[DB] Using POSTGRESQL');
    const sslEnabled = process.env.DB_SSL === 'true';
    poolInstance = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: sslEnabled ? { rejectUnauthorized: false } : false,
        max: Number(process.env.DB_POOL_MAX || 10),
        idleTimeoutMillis: Number(process.env.DB_IDLE_TIMEOUT_MS || 30000),
        connectionTimeoutMillis: Number(process.env.DB_CONN_TIMEOUT_MS || 10000)
    });

    queryFn = async (text, params = []) => {
        return poolInstance.query(text, params);
    };

    testConnFn = async () => {
        return queryFn('SELECT 1');
    };
}

export const pool = poolInstance;
export const query = queryFn;
export const testConnection = testConnFn;

export default {
    pool,
    query,
    testConnection
};

const router = require('express').Router();
const db = require('../db');
const { verifyToken, checkRole } = require('../auth');

const ALLOWED_TABLES = new Set([
  'users', 'projects', 'tasks', 'submissions', 'clients', 'teams', 'messages',
  'announcements', 'notifications', 'portal_access', 'client_interactions',
  'drive_items', 'drive_access', 'audit_log', 'login_log', 'tickets', 'payments'
]);

// List all tables
router.get('/tables', verifyToken, checkRole('admin'), (req, res) => {
  const rows = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'").all();
  const safeTables = rows.map(r => r.name).filter(name => ALLOWED_TABLES.has(name));
  res.json(safeTables);
});

// Get table data (paginated, max 100 rows)
router.get('/table/:name', verifyToken, checkRole('admin'), (req, res) => {
  const { name } = req.params;
  const offset = Math.max(parseInt(req.query.offset, 10) || 0, 0);
  const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 100, 1), 100);
  
  try {
    if (!ALLOWED_TABLES.has(name)) {
      return res.status(403).json({ error: 'Illegal table access' });
    }

    const rows = db.prepare(`SELECT * FROM ${name} LIMIT ? OFFSET ?`).all(limit, offset);
    res.json(rows);
  } catch (e) {
    console.error('DB admin read error:', e);
    res.status(400).json({ error: 'Database error' });
  }
});

module.exports = router;

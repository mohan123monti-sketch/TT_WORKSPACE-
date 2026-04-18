const router = require('express').Router();
const db = require('../db');
const { verifyToken } = require('../auth');

// List all tables
router.get('/tables', verifyToken, (req, res) => {
  const rows = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'").all();
  res.json(rows.map(r => r.name));
});

// Get table data (paginated, max 100 rows)
router.get('/table/:name', verifyToken, (req, res) => {
  const { name } = req.params;
  const offset = parseInt(req.query.offset) || 0;
  const limit = Math.min(parseInt(req.query.limit) || 100, 100);
  
  try {
    // SECURITY: Validate table name against real tables to prevent SQL injection
    const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all().map(r => r.name);
    if (!tables.includes(name)) {
      return res.status(403).json({ error: 'Illegal table access' });
    }

    const rows = db.prepare(`SELECT * FROM ${name} LIMIT ? OFFSET ?`).all(limit, offset);
    res.json(rows);
  } catch (e) {
    res.status(400).json({ error: 'Database error: ' + e.message });
  }
});

module.exports = router;

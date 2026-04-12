const router = require('express').Router();
const db = require('../db');
const { verifyToken, checkRole } = require('../auth');

// GET /api/admin/audit
router.get('/audit', verifyToken, checkRole('admin'), (req, res) => {
  const logs = db.prepare(`
    SELECT a.*, u.name as user_name 
    FROM audit_log a 
    JOIN users u ON u.id = a.user_id 
    ORDER BY a.created_at DESC LIMIT 100
  `).all();
  res.json(logs);
});

// GET /api/admin/heatmap (Departmental Load)
router.get('/heatmap', verifyToken, checkRole('admin'), (req, res) => {
  const roles = ['admin', 'team_leader', 'rnd', 'writer', 'designer', 'media_manager', 'creator', 'client_handler'];
  const data = roles.map(role => {
    const count = db.prepare('SELECT COUNT(*) as c FROM tasks WHERE role_required=? AND status != "approved"').get(role).c;
    const pending = db.prepare('SELECT COUNT(*) as c FROM tasks WHERE role_required=? AND status="pending"').get(role).c;
    return { role, total: count, pending: pending };
  });
  res.json(data);
});

// GET /api/admin/roles-summary
router.get('/roles-summary', verifyToken, checkRole('admin'), (req, res) => {
  const roles = ['admin', 'team_leader', 'rnd', 'writer', 'designer', 'media_manager', 'creator', 'client_handler'];
  const summary = roles.map(r => {
    const count = db.prepare('SELECT COUNT(*) as c FROM users WHERE role=?').get(r).c;
    return { role: r, count };
  });
  res.json(summary);
});

// GET /api/admin/roles-users
router.get('/roles-users', verifyToken, checkRole('admin'), (req, res) => {
  const roles = ['admin', 'team_leader', 'rnd', 'writer', 'designer', 'media_manager', 'creator', 'client_handler'];
  const result = roles.map(r => {
    const users = db.prepare('SELECT id, name, email FROM users WHERE role=? ORDER BY name ASC').all(r);
    return { role: r, count: users.length, users };
  });
  res.json(result);
});

// POST /api/admin/rollback/:id
router.post('/rollback/:id', verifyToken, checkRole('admin'), (req, res) => {
  const log = db.prepare('SELECT * FROM audit_log WHERE id=?').get(req.params.id);
  if (!log) return res.status(404).json({ message: 'Audit entry not found' });

  try {
    if (log.action === 'UPDATE' && log.old_data) {
      const oldData = JSON.parse(log.old_data);
      const columns = Object.keys(oldData).filter(c => !['id', 'created_at', 'updated_at'].includes(c));
      const placeholders = columns.map(c => `${c}=?`).join(',');
      const values = columns.map(c => oldData[c]);
      db.prepare(`UPDATE ${log.table_name} SET ${placeholders} WHERE id=?`).run(...values, log.record_id);
    } else if (log.action === 'INSERT') {
      db.prepare(`DELETE FROM ${log.table_name} WHERE id=?`).run(log.record_id);
    } else if (log.action === 'DELETE' && log.old_data) {
      const oldData = JSON.parse(log.old_data);
      const cols = Object.keys(oldData);
      const placeholders = cols.map(() => '?').join(',');
      db.prepare(`INSERT INTO ${log.table_name} (${cols.join(',')}) VALUES (${placeholders})`).run(...cols.map(c => oldData[c]));
    } else {
      return res.status(400).json({ message: 'Warp protocol cannot restore this record type (missing metadata)' });
    }

    db.prepare('INSERT INTO audit_log (user_id, action, table_name, record_id, details) VALUES (?,?,?,?,?)')
      .run(req.user.id, 'WARP_RESTORE', log.table_name, log.record_id, `Restored record from log #${log.id}`);

    res.json({ message: 'Temporal Warp successful' });
  } catch (err) {
    res.status(500).json({ message: 'Warp failed: ' + err.message });
  }
});

module.exports = router;

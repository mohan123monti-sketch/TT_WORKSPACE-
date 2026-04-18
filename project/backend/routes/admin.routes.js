const router = require('express').Router();
const db = require('../db');
const { verifyToken, checkRole } = require('../auth');

const BUILTIN_ROLE_NAMES = [
  'admin', 'team_leader', 'rnd', 'writer',
  'designer', 'media_manager', 'creator', 'client_handler',
  'frontend', 'backend', 'frontend_backend', 'production'
];

function normalizeRoleName(value) {
  return String(value || '').trim().toLowerCase().replace(/\s+/g, '_');
}

function replaceSecondaryRoleReferences(oldRole, newRole) {
  const users = db.prepare("SELECT id, secondary_roles FROM users WHERE (',' || COALESCE(secondary_roles, '') || ',') LIKE ?").all(`%,${oldRole},%`);
  users.forEach(user => {
    const nextRoles = (user.secondary_roles || '')
      .split(',')
      .map(role => role.trim())
      .filter(Boolean)
      .map(role => (role === oldRole ? newRole : role));
    db.prepare('UPDATE users SET secondary_roles=? WHERE id=?').run(nextRoles.join(','), user.id);
  });
}

function removeSecondaryRoleReferences(roleName) {
  const users = db.prepare("SELECT id, secondary_roles FROM users WHERE (',' || COALESCE(secondary_roles, '') || ',') LIKE ?").all(`%,${roleName},%`);
  users.forEach(user => {
    const nextRoles = (user.secondary_roles || '')
      .split(',')
      .map(role => role.trim())
      .filter(Boolean)
      .filter(role => role !== roleName);
    db.prepare('UPDATE users SET secondary_roles=? WHERE id=?').run(nextRoles.join(','), user.id);
  });
}

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
  const roles = BUILTIN_ROLE_NAMES;
  const data = roles.map(role => {
    const count = db.prepare('SELECT COUNT(*) as c FROM tasks WHERE role_required=? AND status != "approved"').get(role).c;
    const pending = db.prepare('SELECT COUNT(*) as c FROM tasks WHERE role_required=? AND status="pending"').get(role).c;
    return { role, total: count, pending: pending };
  });
  res.json(data);
});

// GET /api/admin/roles-summary
router.get('/roles-summary', verifyToken, checkRole('admin'), (req, res) => {
  const summary = BUILTIN_ROLE_NAMES.map(r => {
    const count = db.prepare('SELECT COUNT(*) as c FROM users WHERE role=?').get(r).c;
    return { role: r, count };
  });
  res.json(summary);
});

// GET /api/admin/roles-users
router.get('/roles-users', verifyToken, checkRole('admin'), (req, res) => {
  const result = BUILTIN_ROLE_NAMES.map(r => {
    const users = db.prepare('SELECT id, name, email FROM users WHERE role=? ORDER BY name ASC').all(r);
    return { role: r, count: users.length, users };
  });
  res.json(result);
});

// GET /api/admin/company-roles
router.get('/company-roles', verifyToken, checkRole('admin'), (req, res) => {
  const roles = db.prepare(`
    SELECT cr.*,
      (
        SELECT COUNT(*)
        FROM users u
        WHERE (',' || COALESCE(u.secondary_roles, '') || ',') LIKE '%,' || cr.name || ',%'
      ) as user_count
    FROM company_roles cr
    ORDER BY cr.is_system DESC, cr.name ASC
  `).all();
  res.json(roles);
});

// POST /api/admin/company-roles
router.post('/company-roles', verifyToken, checkRole('admin'), (req, res) => {
  const { name, description, color } = req.body;
  const roleName = normalizeRoleName(name);
  if (!roleName) return res.status(400).json({ message: 'Role name required' });
  try {
    const result = db.prepare(
      'INSERT INTO company_roles(name, description, color, is_system, created_by) VALUES(?,?,?,?,?)'
    ).run(roleName, description || '', color || '#4f46e5', 0, req.user.id);
    res.json({ message: 'Role created', id: result.lastInsertRowid });
  } catch (err) {
    if (err.message.includes('UNIQUE')) return res.status(409).json({ message: 'Role already exists' });
    res.status(500).json({ message: 'Failed to create role' });
  }
});

// PUT /api/admin/company-roles/:id
router.put('/company-roles/:id', verifyToken, checkRole('admin'), (req, res) => {
  const role = db.prepare('SELECT * FROM company_roles WHERE id=?').get(req.params.id);
  if (!role) return res.status(404).json({ message: 'Role not found' });

  const nextName = req.body.name !== undefined ? normalizeRoleName(req.body.name) : role.name;
  const nextDescription = req.body.description !== undefined ? String(req.body.description).trim() : role.description;
  const nextColor = req.body.color !== undefined ? String(req.body.color).trim() : role.color;

  if (!nextName) return res.status(400).json({ message: 'Role name required' });
  if (role.is_system && nextName !== role.name) {
    return res.status(400).json({ message: 'System roles cannot be renamed' });
  }

  try {
    db.prepare('UPDATE company_roles SET name=?, description=?, color=?, updated_at=CURRENT_TIMESTAMP WHERE id=?')
      .run(nextName, nextDescription || '', nextColor || '#4f46e5', req.params.id);

    if (!role.is_system && nextName !== role.name) {
      replaceSecondaryRoleReferences(role.name, nextName);
    }

    res.json({ message: 'Role updated' });
  } catch (err) {
    if (err.message.includes('UNIQUE')) return res.status(409).json({ message: 'Role already exists' });
    res.status(500).json({ message: 'Failed to update role' });
  }
});

// DELETE /api/admin/company-roles/:id
router.delete('/company-roles/:id', verifyToken, checkRole('admin'), (req, res) => {
  const role = db.prepare('SELECT * FROM company_roles WHERE id=?').get(req.params.id);
  if (!role) return res.status(404).json({ message: 'Role not found' });
  if (role.is_system) {
    return res.status(400).json({ message: 'System roles cannot be deleted' });
  }

  removeSecondaryRoleReferences(role.name);
  db.prepare('DELETE FROM company_roles WHERE id=?').run(req.params.id);
  res.json({ message: 'Role deleted' });
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

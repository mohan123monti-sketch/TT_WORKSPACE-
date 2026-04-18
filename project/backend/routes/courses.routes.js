const router = require('express').Router();
const db = require('../db');
const { verifyToken } = require('../auth');

// List all courses (optionally filter by team/user/project)
router.get('/', verifyToken, (req, res) => {
  const { team, user, project } = req.query;
  let sql = 'SELECT * FROM courses WHERE 1=1';
  const params = [];
  if (team) { sql += ' AND (access_team IS NULL OR access_team = ? OR access_team = "")'; params.push(team); }
  if (user) { sql += ' AND (access_user IS NULL OR access_user = ? OR access_user = "")'; params.push(user); }
  if (project) { sql += ' AND (access_project IS NULL OR access_project = ? OR access_project = "")'; params.push(project); }
  sql += ' ORDER BY created_at DESC';
  const rows = db.prepare(sql).all(...params);
  res.json(rows);
});

// Add a new course
router.post('/', verifyToken, (req, res) => {
  const { title, description, link, access_team, access_user, access_project } = req.body;
  if (!title || !link) return res.status(400).json({ error: 'Title and link required' });
  const created_by = req.user?.id || 1;
  const stmt = db.prepare('INSERT INTO courses (title, description, link, created_by, access_team, access_user, access_project) VALUES (?, ?, ?, ?, ?, ?, ?)');
  const info = stmt.run(title, description || '', link, created_by, access_team || '', access_user || '', access_project || '');
  res.json({ id: info.lastInsertRowid });
});

// Delete a course
router.delete('/:id', verifyToken, (req, res) => {
  const { id } = req.params;
  db.prepare('DELETE FROM courses WHERE id=?').run(id);
  res.json({ success: true });
});

module.exports = router;

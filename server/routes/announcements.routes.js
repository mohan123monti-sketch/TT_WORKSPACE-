const router = require('express').Router();
const db     = require('../db');
const { verifyToken, checkRole } = require('../auth');
const { notifyUsers } = require('../services/notification.service');

router.get('/', verifyToken, (req, res) => {
  const items = db.prepare(`
    SELECT a.*, u.name as author_name FROM announcements a
    LEFT JOIN users u ON u.id=a.created_by
    ORDER BY a.pinned DESC, a.created_at DESC
  `).all();
  res.json(items);
});

router.post('/', verifyToken, checkRole('admin', 'media_manager', 'production'), (req, res) => {
  const { title, body, pinned } = req.body;
  if (!title || !body) return res.status(400).json({ message: 'Title and body required' });
  const result = db.prepare('INSERT INTO announcements(title,body,created_by,pinned) VALUES(?,?,?,?)').run(title,body,req.user.id,pinned?1:0);
  const users = db.prepare("SELECT id FROM users WHERE is_active=1 AND id!=?").all(req.user.id).map(u => u.id);
  notifyUsers(users, `📢 New announcement: "${title}"`, 'info', 'Tech Turf Announcement').catch(() => {});
  res.json({ message: 'Announcement posted', id: result.lastInsertRowid });
});

router.put('/:id', verifyToken, checkRole('admin', 'media_manager', 'production'), (req, res) => {
  const { title, body, pinned } = req.body;
  const existing = db.prepare('SELECT * FROM announcements WHERE id=?').get(req.params.id);
  if (!existing) return res.status(404).json({ message: 'Not found' });
  db.prepare(`
    UPDATE announcements
    SET title=COALESCE(?, title),
        body=COALESCE(?, body),
        pinned=COALESCE(?, pinned)
    WHERE id=?
  `).run(
    title !== undefined ? title : null,
    body !== undefined ? body : null,
    pinned !== undefined ? (pinned ? 1 : 0) : null,
    req.params.id
  );
  res.json({ message: 'Announcement updated' });
});

router.put('/:id/pin', verifyToken, checkRole('admin', 'media_manager', 'production'), (req, res) => {
  const a = db.prepare('SELECT * FROM announcements WHERE id=?').get(req.params.id);
  if (!a) return res.status(404).json({ message: 'Not found' });
  db.prepare('UPDATE announcements SET pinned=? WHERE id=?').run(a.pinned ? 0 : 1, req.params.id);
  res.json({ message: 'Pin toggled' });
});

router.delete('/:id', verifyToken, checkRole('admin', 'media_manager', 'production'), (req, res) => {
  db.prepare('DELETE FROM announcements WHERE id=?').run(req.params.id);
  res.json({ message: 'Deleted' });
});

// Admin broadcast endpoint
router.post('/broadcast', verifyToken, checkRole('admin', 'media_manager', 'production'), (req, res) => {
  const { body } = req.body;
  if (!body) return res.status(400).json({ message: 'Message required' });
  const users = db.prepare('SELECT id FROM users WHERE is_active=1').all().map(u => u.id);
  notifyUsers(users, `📢 Broadcast: ${body}`, 'info', 'Tech Turf Broadcast').catch(() => {});
  res.json({ message: 'Broadcast sent' });
});

module.exports = router;

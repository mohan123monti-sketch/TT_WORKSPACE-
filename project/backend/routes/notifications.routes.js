const router = require('express').Router();
const db     = require('../db');
const { verifyToken, checkRole } = require('../auth');
const { notifyUsers } = require('../services/notification.service');

router.get('/', verifyToken, (req, res) => {
  const items = db.prepare('SELECT * FROM notifications WHERE user_id=? ORDER BY created_at DESC LIMIT 50').all(req.user.id);
  res.json(items);
});

router.put('/:id/read', verifyToken, (req, res) => {
  db.prepare('UPDATE notifications SET is_read=1 WHERE id=? AND user_id=?').run(req.params.id, req.user.id);
  res.json({ message: 'Marked read' });
});

router.put('/read-all', verifyToken, (req, res) => {
  db.prepare('UPDATE notifications SET is_read=1 WHERE user_id=?').run(req.user.id);
  res.json({ message: 'All marked read' });
});

router.post('/broadcast', verifyToken, checkRole('admin'), (req, res) => {
  const { message, type, role } = req.body;
  if (!message) return res.status(400).json({ message: 'message required' });
  let users;
  if (role) {
    users = db.prepare('SELECT id FROM users WHERE role=? AND is_active=1').all(role);
  } else {
    users = db.prepare('SELECT id FROM users WHERE is_active=1 AND id!=?').all(req.user.id);
  }
  notifyUsers(users.map(u => u.id), message, type || 'info', 'Tech Turf Broadcast').catch(() => {});
  res.json({ message: `Broadcast sent to ${users.length} users` });
});

module.exports = router;

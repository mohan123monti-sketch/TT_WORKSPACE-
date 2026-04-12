const router = require('express').Router();
const db     = require('../db');
const { verifyToken, checkRole } = require('../auth');

// --- SOCIAL SCHEDULING (Broadcast Hub) ---
router.get('/posts', verifyToken, (req, res) => {
  const posts = db.prepare('SELECT m.*, u.name as author_name FROM media_posts m JOIN users u ON u.id=m.author_id ORDER BY m.schedule_at ASC').all();
  res.json(posts);
});

router.post('/posts', verifyToken, checkRole('admin','media_manager'), (req, res) => {
  const { title, platform, schedule_at } = req.body;
  const result = db.prepare('INSERT INTO media_posts (title, platform, schedule_at, author_id) VALUES (?,?,?,?)')
    .run(title, platform, schedule_at, req.user.id);
  res.json({ message: 'Broadcast protocol scheduled', id: result.lastInsertRowid });
});

router.put('/posts/:id/status', verifyToken, checkRole('admin','media_manager'), (req, res) => {
  const { status } = req.body;
  db.prepare('UPDATE media_posts SET status=? WHERE id=?').run(status, req.params.id);
  res.json({ message: `Broadcast status updated to ${status}` });
});

// --- TRANSCODE ENGINE (Mock Engine) ---
router.post('/transcode', verifyToken, checkRole('admin','media_manager','creator'), (req, res) => {
  const { submission_id, target_format } = req.body;
  
  // Mock transcode logic
  const formats = { 'web': 'mp4', 'social': 'mov', 'archive': 'mkv' };
  const resultFormat = formats[target_format] || 'mp4';
  
  res.json({
    status: 'Transcode Success',
    resultFile: `TRANSCODE_TT_${submission_id}.${resultFormat}`,
    originalityIndex: 99
  });
});

module.exports = router;

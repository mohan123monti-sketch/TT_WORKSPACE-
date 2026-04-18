const router = require('express').Router();
const db     = require('../db');
const { verifyToken, checkRole } = require('../auth');

// --- KNOWLEDGE BASE (R&D Graph) ---
router.get('/knowledge', verifyToken, (req, res) => {
  const articles = db.prepare('SELECT k.*, u.name as author_name FROM knowledge_base k JOIN users u ON u.id=k.author_id ORDER BY k.created_at DESC').all();
  res.json(articles);
});

router.post('/knowledge', verifyToken, checkRole('admin','rnd'), (req, res) => {
  const { title, content, category, tags } = req.body;
  const result = db.prepare('INSERT INTO knowledge_base (title, content, category, author_id, tags) VALUES (?,?,?,?,?)')
    .run(title, content, category, req.user.id, tags);
  res.json({ message: 'Research paper published', id: result.lastInsertRowid });
});

// --- EXPERIMENTS (Lab) ---
router.get('/experiments', verifyToken, (req, res) => {
  const experiments = db.prepare('SELECT e.*, u.name as owner_name FROM lab_experiments e JOIN users u ON u.id=e.owner_id ORDER BY e.updated_at DESC').all();
  res.json(experiments);
});

router.post('/experiments', verifyToken, checkRole('admin','rnd'), (req, res) => {
  const { title, description } = req.body;
  const result = db.prepare('INSERT INTO lab_experiments (title, description, owner_id) VALUES (?,?,?)')
    .run(title, description, req.user.id);
  res.json({ message: 'Experiment initiated', id: result.lastInsertRowid });
});

router.put('/experiments/:id/results', verifyToken, checkRole('admin','rnd'), (req, res) => {
  const { results, status } = req.body;
  db.prepare('UPDATE lab_experiments SET results=?, status=?, updated_at=CURRENT_TIMESTAMP WHERE id=?').run(results, status, req.params.id);
  res.json({ message: 'Research findings updated' });
});

module.exports = router;

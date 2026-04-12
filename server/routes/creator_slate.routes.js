const router = require('express').Router();
const db     = require('../db');
const { verifyToken, checkRole } = require('../auth');

// --- PRODUCTION SLATE (Calendar) ---
router.get('/events', verifyToken, (req, res) => {
  const events = db.prepare('SELECT p.*, u.name as assigned_name FROM production_events p JOIN users u ON u.id=p.assigned_to ORDER BY p.start_at ASC').all();
  res.json(events);
});

router.post('/events', verifyToken, checkRole('admin','creator'), (req, res) => {
  const { title, description, start_at, end_at, location } = req.body;
  const result = db.prepare('INSERT INTO production_events (title, description, start_at, end_at, location, assigned_to) VALUES (?,?,?,?,?,?)')
    .run(title, description, start_at, end_at, location, req.user.id);
  res.json({ message: 'Event added to Slate', id: result.lastInsertRowid });
});

// --- GEAR INVENTORY (Checklist) ---
router.get('/gear', verifyToken, (req, res) => {
  const inventory = db.prepare('SELECT g.*, u.name as user_name FROM gear_inventory g LEFT JOIN users u ON u.id=g.last_used_by ORDER BY g.name ASC').all();
  res.json(inventory);
});

router.post('/gear', verifyToken, checkRole('admin','creator'), (req, res) => {
  const { name, condition } = req.body;
  const result = db.prepare('INSERT INTO gear_inventory (name, condition) VALUES (?,?)').run(name, condition);
  res.json({ message: 'Gear added to inventory', id: result.lastInsertRowid });
});

router.put('/gear/:id/status', verifyToken, checkRole('admin','creator'), (req, res) => {
  const { status } = req.body;
  db.prepare('UPDATE gear_inventory SET status=?, last_used_by=? WHERE id=?').run(status, req.user.id, req.params.id);
  res.json({ message: `Gear status updated to ${status}` });
});

// --- NEXUS CLIPS (Mock AI) ---
router.post('/nexus-clips', verifyToken, checkRole('admin','creator'), (req, res) => {
  const { submission_id } = req.body;
  if (!submission_id) return res.status(400).json({ message: 'Submission ID required' });

  // Mock clip generation
  const clips = [
    { title: 'Intro Sequence', duration: '0:15', score: 85 },
    { title: 'Technical Demonstration', duration: '0:45', score: 92 },
    { title: 'Outro Hook', duration: '0:10', score: 78 }
  ];
  
  res.json({ submission_id, clips, summary: 'Nexus AI generated high-impact clips from the raw footage.' });
});

module.exports = router;

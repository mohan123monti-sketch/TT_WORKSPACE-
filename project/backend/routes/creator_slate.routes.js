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

router.post('/nexus-clips', verifyToken, checkRole('admin','creator'), (req, res) => {
  const { submission_id } = req.body;
  if (!submission_id) return res.status(400).json({ message: 'Submission ID required' });

  const submission = db.prepare('SELECT s.id, s.content_text, s.file_path, t.title as task_title FROM submissions s LEFT JOIN tasks t ON t.id=s.task_id WHERE s.id=?').get(submission_id);
  if (!submission) return res.status(404).json({ message: 'Submission not found' });

  const baseTitle = submission.task_title || 'Submission Review';
  const contentLength = (submission.content_text || '').split(/\s+/).filter(Boolean).length;
  const clips = [
    { title: `${baseTitle} - Opening`, duration: '0:15', score: Math.min(98, 70 + Math.min(20, contentLength)) },
    { title: `${baseTitle} - Core Segment`, duration: '0:45', score: Math.min(98, 75 + Math.min(15, contentLength / 2)) },
    { title: `${baseTitle} - Closing`, duration: '0:10', score: Math.min(98, 65 + Math.min(25, contentLength)) }
  ];

  res.json({ submission_id, clips, summary: 'Clip suggestions derived from the submission metadata.' });
});

module.exports = router;

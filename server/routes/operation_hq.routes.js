const router = require('express').Router();
const db     = require('../db');
const { verifyToken, checkRole } = require('../auth');

// --- NEXUS FORECASTING (Mock AI) ---
router.post('/nexus-forecasting', verifyToken, checkRole('admin','team_leader'), (req, res) => {
  const { project_id } = req.body;
  if (!project_id) return res.status(400).json({ message: 'Project ID required' });

  // Mock forecasting logic
  const tasks = db.prepare('SELECT status FROM tasks WHERE project_id=?').all(project_id);
  const completed = tasks.filter(t => t.status === 'approved').length;
  const total = tasks.length;
  const progressPercent = total > 0 ? (completed / total) * 100 : 0;
  
  res.json({
    project_id,
    completionForecast: 'Estimated 8 days remaining.',
    confidenceIndex: 92,
    progressPercent,
    recommendation: 'Nexus AI suggests assigning 1 more writer for accelerated delivery.'
  });
});

// --- BLITZ ASSIGN (Mock AI) ---
router.post('/blitz-assign', verifyToken, checkRole('admin','team_leader'), (req, res) => {
  const { project_id, users_count } = req.body;
  if (!project_id) return res.status(400).json({ message: 'Project ID required' });
  
  // Mock bulk assignment logic
  const tasks = db.prepare('SELECT id FROM tasks WHERE project_id=? AND assigned_to IS NULL').all(project_id);
  const users = db.prepare('SELECT id FROM users WHERE role NOT IN ("admin", "client_handler") LIMIT ?').all(users_count || 3);

  if (users.length === 0) {
    return res.status(400).json({ message: 'No eligible users available for assignment.' });
  }
  
  let assignedCount = 0;
  tasks.forEach((t, i) => {
    if (users[i % users.length]) {
       db.prepare('UPDATE tasks SET assigned_to=?, status="in_progress" WHERE id=?').run(users[i % users.length].id, t.id);
       assignedCount++;
    }
  });

  res.json({ message: `Blitz Assign completed: ${assignedCount} tasks distributed.`, assignedCount });
});

module.exports = router;

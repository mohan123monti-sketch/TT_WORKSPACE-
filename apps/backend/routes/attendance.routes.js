const router = require('express').Router();
const db = require('../db');
const { verifyToken } = require('../auth');

// Get today's timesheet for the logged-in user
router.get('/today', verifyToken, (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const sheet = db.prepare('SELECT * FROM timesheets WHERE user_id=? AND date=? ORDER BY created_at DESC LIMIT 1').get(req.user.id, today);
    res.json(sheet || { status: 'not_started' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch attendance' });
  }
});

// Clock In
router.post('/clock-in', verifyToken, (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const now = new Date().toISOString();
    
    // Check if already clocked in today without clock out
    const existing = db.prepare('SELECT * FROM timesheets WHERE user_id=? AND date=? AND clock_out IS NULL').get(req.user.id, today);
    if (existing) {
      return res.status(400).json({ error: 'Already clocked in' });
    }

    db.prepare('INSERT INTO timesheets(user_id, clock_in, date) VALUES(?,?,?)').run(req.user.id, now, today);
    res.json({ message: 'Clocked in successfully', clock_in: now });
  } catch (err) {
    res.status(500).json({ error: 'Failed to clock in' });
  }
});

// Clock Out
router.post('/clock-out', verifyToken, (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const now = new Date();
    
    const sheet = db.prepare('SELECT * FROM timesheets WHERE user_id=? AND date=? AND clock_out IS NULL ORDER BY created_at DESC LIMIT 1').get(req.user.id, today);
    if (!sheet) {
      return res.status(400).json({ error: 'Not currently clocked in' });
    }

    const clockIn = new Date(sheet.clock_in);
    const diffMins = Math.round((now - clockIn) / 60000);

    db.prepare('UPDATE timesheets SET clock_out=?, duration_mins=? WHERE id=?').run(now.toISOString(), diffMins, sheet.id);
    res.json({ message: 'Clocked out successfully', duration_mins: diffMins });
  } catch (err) {
    res.status(500).json({ error: 'Failed to clock out' });
  }
});

module.exports = router;

const router = require('express').Router();
const db = require('../db');
const { verifyToken, checkRole } = require('../auth');

// === LEAVES API ===

// Get leaves (Admin sees all, users see their own)
router.get('/leaves', verifyToken, (req, res) => {
  try {
    let query = `
      SELECT l.*, u.name as user_name 
      FROM leave_requests l
      JOIN users u ON u.id = l.user_id
    `;
    const params = [];
    
    if (req.user.role !== 'admin' && req.user.role !== 'team_leader') {
      query += ' WHERE l.user_id = ?';
      params.push(req.user.id);
    }
    
    query += ' ORDER BY l.created_at DESC';
    const leaves = db.prepare(query).all(...params);
    res.json(leaves);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch leaves' });
  }
});

// Apply for leave
router.post('/leaves', verifyToken, (req, res) => {
  try {
    const { leave_type, start_date, end_date, reason } = req.body;
    db.prepare(`
      INSERT INTO leave_requests (user_id, leave_type, start_date, end_date, reason, status)
      VALUES (?, ?, ?, ?, ?, 'pending')
    `).run(req.user.id, leave_type, start_date, end_date, reason);
    
    if (global.io) global.io.emit('hrUpdated'); // For real-time sync
    res.json({ message: 'Leave applied successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to apply for leave' });
  }
});

// Approve/Reject leave (Admin only)
router.put('/leaves/:id', verifyToken, checkRole('admin', 'team_leader'), (req, res) => {
  try {
    const { status, admin_comment } = req.body;
    db.prepare('UPDATE leave_requests SET status = ?, admin_comment = ? WHERE id = ?').run(status, admin_comment, req.params.id);
    
    if (global.io) global.io.emit('hrUpdated');
    res.json({ message: `Leave ${status}` });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update leave' });
  }
});


// === PAYROLL API ===

// Get payroll slips (Admin sees all, users see their own)
router.get('/payroll', verifyToken, (req, res) => {
  try {
    let query = `
      SELECT p.*, u.name as user_name 
      FROM payroll p
      JOIN users u ON u.id = p.user_id
    `;
    const params = [];
    
    if (req.user.role !== 'admin') {
      query += ' WHERE p.user_id = ?';
      params.push(req.user.id);
    }
    
    query += ' ORDER BY p.generated_on DESC';
    const payroll = db.prepare(query).all(...params);
    res.json(payroll);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch payroll' });
  }
});

// Generate payroll slip (Admin only)
router.post('/payroll', verifyToken, checkRole('admin'), (req, res) => {
  try {
    const { user_id, month, year, base_salary, bonuses, deductions } = req.body;
    const net = Number(base_salary) + Number(bonuses || 0) - Number(deductions || 0);
    
    db.prepare(`
      INSERT INTO payroll (user_id, month, year, base_salary, bonuses, deductions, net_salary, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, 'pending')
    `).run(user_id, month, year, base_salary, bonuses || 0, deductions || 0, net);
    
    if (global.io) global.io.emit('hrUpdated');
    res.json({ message: 'Payroll slip generated successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to generate payroll' });
  }
});

module.exports = router;

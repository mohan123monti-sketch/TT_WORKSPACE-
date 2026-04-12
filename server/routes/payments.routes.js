const router = require('express').Router();
const db = require('../db');
const { verifyToken } = require('../auth');

// List all payments (optionally filter by user)
router.get('/', verifyToken, (req, res) => {
  const { user_id } = req.query;
  let sql = `
    SELECT p.*, u.name as user_name,
      CASE
        WHEN p.payment_date IS NOT NULL THEN 'recorded'
        ELSE 'pending'
      END as status
    FROM payments p
    LEFT JOIN users u ON p.user_id = u.id
    WHERE 1=1
  `;
  const params = [];
  if (user_id) { sql += ' AND user_id = ?'; params.push(user_id); }
  sql += ' ORDER BY payment_date DESC, created_at DESC';
  const rows = db.prepare(sql).all(...params);
  res.json(rows);
});

// Add a new payment
router.post('/', verifyToken, (req, res) => {
  const { user_id, amount, currency, payment_date, method, notes } = req.body;
  if (!user_id || !amount) return res.status(400).json({ error: 'User and amount required' });
  const created_by = req.user?.id || 1;
  const stmt = db.prepare('INSERT INTO payments (user_id, amount, currency, payment_date, method, notes, created_by) VALUES (?, ?, ?, ?, ?, ?, ?)');
  const info = stmt.run(user_id, amount, currency || 'USD', payment_date || null, method || '', notes || '', created_by);
  res.json({ id: info.lastInsertRowid });
});

// Delete a payment
router.delete('/:id', verifyToken, (req, res) => {
  const { id } = req.params;
  db.prepare('DELETE FROM payments WHERE id=?').run(id);
  res.json({ success: true });
});

module.exports = router;

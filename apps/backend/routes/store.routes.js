const router = require('express').Router();
const db = require('../db');
const { verifyToken, checkRole } = require('../auth');

// Get all store items
router.get('/items', verifyToken, (req, res) => {
  try {
    const items = db.prepare('SELECT * FROM store_items WHERE stock > 0').all();
    res.json(items);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch store items' });
  }
});

// Add store item (Admin only)
router.post('/items', verifyToken, checkRole('admin'), (req, res) => {
  try {
    const { title, description, points_cost, stock, image_url } = req.body;
    db.prepare('INSERT INTO store_items (title, description, points_cost, stock, image_url) VALUES (?, ?, ?, ?, ?)').run(title, description, points_cost, stock, image_url);
    if (global.io) global.io.emit('storeUpdated');
    res.json({ message: 'Item added successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to add item' });
  }
});

// Purchase item
router.post('/purchase', verifyToken, (req, res) => {
  try {
    const { item_id } = req.body;
    
    db.prepare('BEGIN IMMEDIATE').run();
    
    const item = db.prepare('SELECT * FROM store_items WHERE id=?').get(item_id);
    const user = db.prepare('SELECT points FROM users WHERE id=?').get(req.user.id);
    
    if (!item || item.stock <= 0) {
      db.prepare('ROLLBACK').run();
      return res.status(400).json({ error: 'Item out of stock' });
    }
    
    if (user.points < item.points_cost) {
      db.prepare('ROLLBACK').run();
      return res.status(400).json({ error: 'Not enough points' });
    }
    
    // Deduct points
    db.prepare('UPDATE users SET points = points - ? WHERE id = ?').run(item.points_cost, req.user.id);
    // Reduce stock
    db.prepare('UPDATE store_items SET stock = stock - 1 WHERE id = ?').run(item.id);
    // Record purchase
    db.prepare('INSERT INTO store_purchases (user_id, item_id, points_spent, status) VALUES (?, ?, ?, ?)').run(req.user.id, item.id, item.points_cost, 'pending');
    
    db.prepare('COMMIT').run();
    
    if (global.io) global.io.emit('storeUpdated');
    res.json({ message: 'Purchase successful!' });
  } catch (err) {
    db.prepare('ROLLBACK').run();
    res.status(500).json({ error: 'Purchase failed' });
  }
});

module.exports = router;

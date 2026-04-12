const router = require('express').Router();
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const db = require('../db');
const { verifyToken, checkRole } = require('../auth');

const DRIVE_ROOT = process.env.DRIVE_ROOT || path.join(__dirname, '../../drive_storage');
if (!fs.existsSync(DRIVE_ROOT)) fs.mkdirSync(DRIVE_ROOT, { recursive: true });

// Multer Storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, DRIVE_ROOT);
  },
  filename: (req, file, cb) => {
    const safeName = file.originalname.replace(/[^a-zA-Z0-9_.-]/g, '_');
    cb(null, Date.now() + '_' + safeName);
  }
});
const upload = multer({ storage });

const isAdmin = (user) => {
  if (!user) return false;
  if (user.role === 'admin') return true;
  const secondary = (user.secondary_roles || '').split(',').map(r => r.trim());
  return secondary.includes('admin');
};

const userCanAccessItem = (userId, itemId) => {
  return !!db.prepare(`
    SELECT 1
    FROM drive_items di
    LEFT JOIN drive_access da ON da.item_id = di.id
    WHERE di.id = ?
      AND (
        di.created_by = ?
        OR da.user_id = ?
        OR EXISTS (
          WITH RECURSIVE parents(id, parent_id) AS (
            SELECT id, parent_id FROM drive_items WHERE id = di.id
            UNION ALL
            SELECT d.id, d.parent_id FROM drive_items d
            JOIN parents ON d.id = parents.parent_id
          )
          SELECT 1
          FROM parents p
          JOIN drive_access da2 ON da2.item_id = p.id
          WHERE da2.user_id = ?
        )
      )
    LIMIT 1
  `).get(itemId, userId, userId, userId);
};

// List items with access control
router.get('/items', verifyToken, (req, res) => {
  const pId = req.query.parentId;
  const parentId = (pId && pId !== 'null' && pId !== 'undefined') ? pId : null;
  const query = 'SELECT * FROM drive_items WHERE (parent_id = ? OR (? IS NULL AND parent_id IS NULL)) ORDER BY type DESC, name ASC';
  const params = [parentId, parentId];
  
  try {
    const items = db.prepare(query).all(...params);
    res.json(items);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Create Folder
router.post('/folder', verifyToken, (req, res) => {
  const { name, parentId: pId } = req.body;
  const parentId = (pId && pId !== 'null' && pId !== 'undefined') ? pId : null;
  
  if (!name) return res.status(400).json({ error: 'Folder name required' });
  if (!isAdmin(req.user)) return res.status(403).json({ error: 'Only admins can create folders' });

  try {
    const result = db.prepare('INSERT INTO drive_items (name, type, parent_id, created_by) VALUES (?, ?, ?, ?)').run(
      name, 'folder', parentId, req.user.id
    );
    res.json({ success: true, id: result.lastInsertRowid });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Upload File
router.post('/upload', verifyToken, upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
  
  const { parentId: pId } = req.body;
  const parentId = (pId && pId !== 'null' && pId !== 'undefined') ? pId : null;

  if (!isAdmin(req.user)) return res.status(403).json({ error: 'Only admins can upload files' });

  try {
    const result = db.prepare('INSERT INTO drive_items (name, type, parent_id, mime_type, file_size, file_path, created_by) VALUES (?, ?, ?, ?, ?, ?, ?)').run(
      req.file.originalname,
      'file',
      parentId,
      req.file.mimetype,
      req.file.size,
      req.file.filename,
      req.user.id
    );
    res.json({ success: true, id: result.lastInsertRowid });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Share Item
router.post('/share', verifyToken, checkRole('admin'), (req, res) => {
  const { itemId, userId, accessLevel } = req.body;
  if (!itemId || !userId) return res.status(400).json({ error: 'Item ID and User ID required' });
  
  try {
    db.prepare('INSERT INTO drive_access (item_id, user_id, access_level) VALUES (?, ?, ?) ON CONFLICT(item_id, user_id) DO UPDATE SET access_level = excluded.access_level').run(
      itemId, userId, accessLevel || 'viewer'
    );
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Get Permissions
router.get('/permissions/:id', verifyToken, checkRole('admin'), (req, res) => {
  try {
    const permissions = db.prepare(`
      SELECT da.*, u.name as user_name, u.email as user_email 
      FROM drive_access da
      JOIN users u ON u.id = da.user_id
      WHERE da.item_id = ?
    `).all(req.params.id);
    res.json(permissions);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Download File
router.get('/download/:id', verifyToken, (req, res) => {
  try {
    const item = db.prepare("SELECT * FROM drive_items WHERE id = ? AND type = 'file'").get(req.params.id);
    if (!item) return res.status(404).json({ error: 'File not found' });

    if (!isAdmin(req.user) && !userCanAccessItem(req.user.id, item.id)) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    const filePath = path.join(DRIVE_ROOT, item.file_path);
    if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'Physical file missing' });
    
    res.download(filePath, item.name);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Delete Item
router.delete('/:id', verifyToken, checkRole('admin'), (req, res) => {
  try {
    const item = db.prepare('SELECT * FROM drive_items WHERE id = ?').get(req.params.id);
    if (!item) return res.status(404).json({ error: 'Item not found' });
    
    if (item.type === 'file') {
      const filePath = path.join(DRIVE_ROOT, item.file_path);
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    }
    
    // SQLite with foreign_keys=ON will handle children of a folder
    db.prepare('DELETE FROM drive_items WHERE id = ?').run(req.params.id);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;

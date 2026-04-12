const router = require('express').Router();
const db     = require('../db');
const { verifyToken, checkRole } = require('../auth');

// --- ASSET GALAXY (Library) ---
router.get('/assets', verifyToken, (req, res) => {
  const assets = db.prepare('SELECT a.*, u.name as uploader_name FROM asset_library a JOIN users u ON u.id=a.uploaded_by ORDER BY a.created_at DESC').all();
  res.json(assets);
});

router.post('/assets', verifyToken, checkRole('admin','designer'), (req, res) => {
  const { title, file_path, file_type, project_id, tags } = req.body;
  if (!title || !file_path) return res.status(400).json({ message: 'Title and file path are required' });
  const result = db.prepare('INSERT INTO asset_library (title, file_path, file_type, project_id, uploaded_by, tags) VALUES (?,?,?,?,?,?)')
    .run(title, file_path, file_type || 'file', project_id || null, req.user.id, tags || '');
  res.json({ message: 'Asset added to Galaxy', id: result.lastInsertRowid });
});

router.post('/validate-colors', verifyToken, checkRole('admin','designer'), (req, res) => {
  const { colors, project_id } = req.body; // colors: array of hex codes
  if (!colors || !Array.isArray(colors)) return res.status(400).json({ message: 'Color palette required' });

  const isValid = colors.every(c => /^#([0-9A-F]{3}){1,2}$/i.test(c));
  const uniqueColors = new Set(colors.map(c => c.toLowerCase()));
  const projectVibe = isValid && uniqueColors.size >= 2 ? 'Aligned' : 'Divergent';
  
  res.json({
    status: isValid ? 'Valid Palette' : 'Invalid Hex Codes',
    alignment: projectVibe,
    recommendation: projectVibe === 'Aligned' ? 'Palette maintains project consistency.' : 'Use a tighter set of brand-aligned colors.'
  });
});

module.exports = router;

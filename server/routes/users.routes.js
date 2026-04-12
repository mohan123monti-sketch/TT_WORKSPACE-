const router = require('express').Router();
const db     = require('../db');
const { verifyToken, checkRole, hashPassword } = require('../auth');
const path = require('path');
const fs = require('fs');
const multer = require('multer');

const avatarsDir = path.join(__dirname, '../../uploads/avatars');
if (!fs.existsSync(avatarsDir)) fs.mkdirSync(avatarsDir, { recursive: true });

const avatarStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, avatarsDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase() || '.png';
    const safeExt = ['.jpg', '.jpeg', '.png', '.webp', '.gif'].includes(ext) ? ext : '.png';
    cb(null, `avatar_u${req.user.id}_${Date.now()}${safeExt}`);
  }
});
const avatarUpload = multer({
  storage: avatarStorage,
  limits: { fileSize: 5 * 1024 * 1024 }
});

// GET /api/users
router.get('/', verifyToken, (req, res) => {
  const { role, search, is_active } = req.query;
  let query  = 'SELECT id,name,email,role,secondary_roles,avatar,badge,points,mobile,github_link,bio,is_active,created_at FROM users WHERE 1=1';
  const params = [];
  if (role) { 
    query += ' AND (role=? OR secondary_roles LIKE ?)'; 
    params.push(role, `%${role}%`); 
  }
  if (search) { query += ' AND (name LIKE ? OR email LIKE ?)'; params.push(`%${search}%`,`%${search}%`); }
  if (is_active !== undefined && is_active !== '') {
    query += ' AND is_active=?';
    params.push(Number(is_active));
  }
  
  const isAdmin = req.user.role === 'admin' || (req.user.secondary_roles || '').split(',').map(r => r.trim()).includes('admin');
  if (!isAdmin) { 
    query += ' AND is_active=1'; 
  } else {
    query += ' AND is_active >= 0'; // Hide soft-deleted users
  }
  
  query += ' ORDER BY name ASC';
  res.json(db.prepare(query).all(...params));
});

// GET /api/users/:id
router.get('/:id', verifyToken, (req, res) => {
  const user = db.prepare('SELECT id,name,email,role,secondary_roles,avatar,badge,points,mobile,github_link,bio,is_active,created_at FROM users WHERE id=?').get(req.params.id);
  if (!user) return res.status(404).json({ message: 'Not found' });
  res.json(user);
});

// PUT /api/users/me/profile
router.put('/me/profile', verifyToken, avatarUpload.single('avatar'), (req, res) => {
  const { name, mobile, github_link, bio } = req.body;

  if (github_link !== undefined && github_link !== null && github_link !== '') {
    const validGitHub = /^https?:\/\/(www\.)?github\.com\/[A-Za-z0-9_.-]+\/?$/i.test(github_link.trim());
    if (!validGitHub) {
      return res.status(400).json({ message: 'Invalid GitHub profile URL' });
    }
  }

  const avatarPath = req.file ? `/uploads/avatars/${req.file.filename}` : undefined;

  try {
    db.prepare(`
      UPDATE users
      SET
        name=COALESCE(?,name),
        mobile=COALESCE(?,mobile),
        github_link=COALESCE(?,github_link),
        bio=COALESCE(?,bio),
        avatar=COALESCE(?,avatar)
      WHERE id=?
    `).run(
      name !== undefined ? String(name).trim() : null,
      mobile !== undefined ? String(mobile).trim() : null,
      github_link !== undefined ? String(github_link).trim() : null,
      bio !== undefined ? String(bio).trim() : null,
      avatarPath !== undefined ? avatarPath : null,
      req.user.id
    );

    const updated = db.prepare('SELECT id,name,email,role,secondary_roles,avatar,badge,points,mobile,github_link,bio,is_active,created_at FROM users WHERE id=?').get(req.user.id);
    res.json({ message: 'Profile updated', user: updated });
  } catch (err) {
    res.status(500).json({ message: 'Failed to update profile' });
  }
});

// GET /api/users/:id/performance
router.get('/:id/performance', verifyToken, (req, res) => {
  const logs = db.prepare('SELECT *, created_at as logged_at FROM performance_log WHERE user_id=? ORDER BY created_at DESC LIMIT 30').all(req.params.id);
  const submissions = db.prepare(`
    SELECT s.*, t.title as task_title, s.created_at as submitted_at FROM submissions s
    JOIN tasks t ON t.id = s.task_id
    WHERE s.submitted_by=? ORDER BY s.created_at DESC LIMIT 10
  `).all(req.params.id);
  const stats = db.prepare(`
    SELECT
      COUNT(*) as total,
      AVG(nexus_score) as avg_score,
      SUM(CASE WHEN leader_status='approved' THEN 1 ELSE 0 END) as approved,
      SUM(CASE WHEN leader_status='rejected' THEN 1 ELSE 0 END) as rejected
    FROM submissions WHERE submitted_by=?
  `).get(req.params.id);
  const score_history = db.prepare(`
    SELECT DATE(created_at) as date, ROUND(AVG(nexus_score), 1) as score
    FROM submissions
    WHERE submitted_by=? AND nexus_score IS NOT NULL
    GROUP BY DATE(created_at)
    ORDER BY DATE(created_at) ASC
  `).all(req.params.id);
  res.json({ logs, submissions, stats, score_history });
});

// POST /api/users
router.post('/', verifyToken, checkRole('admin'), async (req, res) => {
  const { name, email, password, role, secondary_roles } = req.body;
  if (!name || !email || !password || !role) return res.status(400).json({ message: 'All fields required' });
  try {
    const hash = await hashPassword(password);
    const result = db.prepare('INSERT INTO users(name,email,password,role,secondary_roles) VALUES(?,?,?,?,?)').run(name,email.toLowerCase().trim(),hash,role,secondary_roles || '');
    res.json({ message: 'User created', id: result.lastInsertRowid });
  } catch(e) {
    if (e.message.includes('UNIQUE')) return res.status(409).json({ message: 'Email already exists' });
    res.status(500).json({ message: 'Server error' });
  }
});

// PUT /api/users/:id
router.put('/:id', verifyToken, checkRole('admin'), (req, res) => {
  const { name, role, secondary_roles, is_active, badge, points } = req.body;
  try {
    db.prepare('UPDATE users SET name=COALESCE(?,name), role=COALESCE(?,role), secondary_roles=COALESCE(?,secondary_roles), is_active=COALESCE(?,is_active), badge=COALESCE(?,badge), points=COALESCE(?,points) WHERE id=?')
      .run(
        name !== undefined ? name : null,
        role !== undefined ? role : null,
        secondary_roles !== undefined ? secondary_roles : null,
        is_active !== undefined ? is_active : null,
        badge !== undefined ? badge : null,
        points !== undefined ? points : null,
        req.params.id
      );
    res.json({ message: 'User updated' });
  } catch(err) {
    console.error('Update User 500 Error:', err);
    res.status(500).json({ message: 'Failed to update user' });
  }
});

// DELETE /api/users/:id
router.delete('/:id', verifyToken, checkRole('admin'), (req, res) => {
  const targetId = Number(req.params.id);
  const selfId = Number(req.user.id);
  
  if (targetId === selfId) {
    return res.status(400).json({ message: 'Refinement Error: Cannot self-terminate administrative account.' });
  }

  try {
    // Safe soft-delete to prevent foreign key errors for related tasks/projects
    // Use parameter binding for the id in the email concatenation to be 100% safe
    const sql = `
      UPDATE users 
      SET name = '[Deleted User]', 
          email = 'deleted_' || id || '@techturf.internal', 
          password = '*', 
          is_active = -1 
      WHERE id = ?
    `;
    const result = db.prepare(sql).run(targetId);
    
    if (result.changes === 0) {
      return res.status(404).json({ message: 'Target user not found or already purged' });
    }

    res.json({ message: 'User soft-deletion successful' });
  } catch (err) {
    console.error('CRITICAL: User deletion failed for ID:', targetId, err.message);
    res.status(500).json({ message: 'System error: ' + err.message });
  }
});

// PUT /api/users/:id/password (admin resets user password)
router.put('/:id/password', verifyToken, checkRole('admin'), async (req, res) => {
  const { password } = req.body;
  if (!password || password.length < 6) return res.status(400).json({ message: 'Password too short' });
  const hash = await hashPassword(password);
  db.prepare('UPDATE users SET password=? WHERE id=?').run(hash, req.params.id);
  res.json({ message: 'Password reset' });
});

// GET /api/users/:id/logins (admin only)
router.get('/:id/logins', verifyToken, checkRole('admin'), (req, res) => {
  const logins = db.prepare('SELECT * FROM login_log WHERE user_id=? ORDER BY login_at DESC LIMIT 30').all(req.params.id);
  res.json(logins);
});

module.exports = router;

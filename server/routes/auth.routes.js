const router  = require('express').Router();
const db      = require('../db');
const { hashPassword, comparePassword, generateToken, verifyToken } = require('../auth');

// POST /api/auth/login
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ message: 'Email and password required' });
  const user = db.prepare('SELECT * FROM users WHERE email = ? AND is_active = 1').get(email.toLowerCase().trim());
  if (!user) return res.status(401).json({ message: 'Invalid credentials' });
  const valid = await comparePassword(password, user.password);
  if (!valid) return res.status(401).json({ message: 'Invalid credentials' });
  // Log login event
  try {
    db.prepare('INSERT INTO login_log(user_id, ip, user_agent) VALUES (?, ?, ?)')
      .run(user.id, req.headers['x-forwarded-for'] || req.connection.remoteAddress || '', req.headers['user-agent'] || '');
  } catch (e) { /* ignore logging errors */ }
  const token = generateToken(user);
  const { password: _, ...safeUser } = user;
  res.json({ token, user: safeUser });
});

// GET /api/auth/me
router.get('/me', verifyToken, (req, res) => {
  const user = db.prepare('SELECT id,name,email,role,secondary_roles,avatar,badge,points,mobile,github_link,bio,is_active,created_at FROM users WHERE id=?').get(req.user.id);
  if (!user) return res.status(404).json({ message: 'User not found' });
  res.json(user);
});

// POST /api/auth/register (admin only)
router.post('/register', verifyToken, async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ message: 'Admin only' });
  const { name, email, password, role } = req.body;
  if (!name || !email || !password || !role) return res.status(400).json({ message: 'All fields required' });
  try {
    const hash = await hashPassword(password);
    const result = db.prepare('INSERT INTO users(name,email,password,role) VALUES(?,?,?,?)').run(name, email.toLowerCase().trim(), hash, role);
    res.json({ message: 'User created', id: result.lastInsertRowid });
  } catch(e) {
    if (e.message.includes('UNIQUE')) return res.status(409).json({ message: 'Email already exists' });
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;

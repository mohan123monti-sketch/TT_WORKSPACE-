const bcrypt = require('bcryptjs');
const jwt    = require('jsonwebtoken');
const db     = require('./db');
require('dotenv').config();

const JWT_SECRET  = process.env.JWT_SECRET || 'techturf_dev_secret_change_this';
const JWT_EXPIRES = '7d';

async function hashPassword(password) {
  return bcrypt.hash(password, 12);
}
async function comparePassword(password, hash) {
  return bcrypt.compare(password, hash);
}
function generateToken(user) {
  return jwt.sign(
    { id: user.id, email: user.email, role: user.role, secondary_roles: user.secondary_roles || '', name: user.name },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES }
  );
}
function verifyToken(req, res, next) {
  const header = req.headers.authorization;
  const queryToken = req.query.token;
  
  if (!header && !queryToken) {
    return res.status(401).json({ message: 'No token provided' });
  }
  
  const token = (queryToken && queryToken !== 'null' && queryToken !== 'undefined') 
                ? queryToken 
                : (header && header.startsWith('Bearer ') ? header.split(' ')[1] : null);

  if (!token) {
    return res.status(401).json({ 
      message: 'No token provided', 
      debug: 'Token was missing or invalid string value ("null"/"undefined")' 
    });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);

    // Always resolve the latest account state from DB so admin role/status updates
    // apply immediately to already logged-in sessions.
    const dbUser = db.prepare('SELECT id,name,email,role,secondary_roles,is_active FROM users WHERE id=?').get(decoded.id);
    if (!dbUser || Number(dbUser.is_active) !== 1) {
      return res.status(401).json({ message: 'Account inactive or not found' });
    }

    req.user = {
      id: dbUser.id,
      name: dbUser.name,
      email: dbUser.email,
      role: dbUser.role,
      secondary_roles: dbUser.secondary_roles || ''
    };
    next();
  } catch(e) {
    console.error('--- AUTH ERROR ---');
    console.error('Source:', queryToken ? 'URL Query' : 'Auth Header');
    console.error('Token Length:', token.length);
    console.error('Token Snippet:', token.substring(0, 15) + '...' + token.substring(token.length - 15));
    console.error('Error Details:', e.message);
    
    return res.status(401).json({ 
      message: 'Invalid or expired token', 
      debug: e.message,
      receivedSnippet: token.substring(0, 10) + '...'
    });
  }
}
function checkRole(...roles) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ message: 'Unauthorized' });
    const primaryMatch = roles.includes(req.user.role);
    const secondaryRoles = (req.user.secondary_roles || '').split(',').map(r => r.trim()).filter(Boolean);
    const secondaryMatch = secondaryRoles.some(r => roles.includes(r));
    if (!primaryMatch && !secondaryMatch) {
      return res.status(403).json({ message: `Forbidden — requires: ${roles.join(' | ')}` });
    }
    next();
  };
}

const ROLE_PERMISSION_MAP = {
  admin: ['*'],
  team_leader: [
    'dashboard.view', 'tasks.view', 'tasks.create', 'tasks.edit', 'tasks.approve',
    'projects.view', 'projects.create', 'projects.edit', 'chat.send', 'submissions.review'
  ],
  writer: ['dashboard.view', 'tasks.view', 'projects.view', 'chat.send'],
  designer: ['dashboard.view', 'tasks.view', 'projects.view', 'chat.send'],
  rnd: ['dashboard.view', 'tasks.view', 'projects.view', 'reports.view', 'chat.send'],
  creator: ['dashboard.view', 'tasks.view', 'projects.view', 'chat.send'],
  media_manager: ['dashboard.view', 'tasks.view', 'projects.view', 'announcements.manage', 'chat.send'],
  client_handler: ['dashboard.view', 'projects.view', 'tasks.view', 'chat.send'],
  frontend: ['dashboard.view', 'tasks.view', 'projects.view', 'chat.send'],
  backend: [
    'dashboard.view', 'tasks.view', 'tasks.edit',
    'projects.view', 'projects.edit', 'reports.view', 'chat.send'
  ],
  frontend_backend: [
    'dashboard.view', 'tasks.view', 'tasks.create', 'tasks.edit',
    'projects.view', 'projects.create', 'projects.edit', 'chat.send'
  ],
  production: [
    'dashboard.view', 'tasks.view', 'tasks.create', 'tasks.edit',
    'projects.view', 'announcements.manage', 'chat.send'
  ]
};

function collectPermissions(user) {
  const roles = [user.role, ...(user.secondary_roles || '').split(',').map(r => r.trim()).filter(Boolean)];
  const permissionSet = new Set();
  roles.forEach(role => {
    (ROLE_PERMISSION_MAP[role] || []).forEach(permission => permissionSet.add(permission));
  });
  return permissionSet;
}

function checkPermission(...permissions) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ message: 'Unauthorized' });
    const permissionSet = collectPermissions(req.user);
    if (permissionSet.has('*')) return next();
    const allowed = permissions.some(permission => permissionSet.has(permission));
    if (!allowed) {
      return res.status(403).json({ message: `Forbidden — requires permission: ${permissions.join(' | ')}` });
    }
    return next();
  };
}

function isStrongPassword(password) {
  const value = String(password || '');
  const hasLength = value.length >= 10;
  const hasUpper = /[A-Z]/.test(value);
  const hasLower = /[a-z]/.test(value);
  const hasNumber = /\d/.test(value);
  const hasSymbol = /[^A-Za-z0-9]/.test(value);
  return hasLength && hasUpper && hasLower && hasNumber && hasSymbol;
}

module.exports = { hashPassword, comparePassword, generateToken, verifyToken, checkRole, checkPermission, isStrongPassword };

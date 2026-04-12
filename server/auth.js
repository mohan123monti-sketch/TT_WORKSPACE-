const bcrypt = require('bcryptjs');
const jwt    = require('jsonwebtoken');
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
    req.user = jwt.verify(token, JWT_SECRET);
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

module.exports = { hashPassword, comparePassword, generateToken, verifyToken, checkRole };

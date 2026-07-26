import bcrypt from 'bcryptjs';
import { db } from '../config/db.js';

export const AuthService = {
  async authenticate(email, password) {
    const [rows] = await db.query('SELECT * FROM users WHERE email = ?', [email]);
    if (rows.length === 0) return null;

    const user = rows[0];
    // Polyfill for TT_INOVNIX using project DB's 'password' column instead of 'password_hash'
    const isMatch = await bcrypt.compare(password, user.password || user.password_hash);
    if (!isMatch) return null;

    const { password: _pw, password_hash, ...userWithoutPassword } = user;
    return userWithoutPassword;
  },

  async findUserByEmail(email) {
    const [rows] = await db.query('SELECT * FROM users WHERE email = ?', [email]);
    if (rows.length === 0) return null;
    
    const user = rows[0];
    const { password: _pw, password_hash, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }
};

import { AuthService } from '../services/auth.service.js';
import { sendSuccess, sendError } from '../utils/responseFormatter.js';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET || 'invonix_super_secret_key_2026';
const JWT_EXPIRES = process.env.JWT_EXPIRES || '1d';

export const login = async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return sendError(res, 400, 'Email and password are required');
  }

  const cleanEmail = email.trim().toLowerCase();
  const user = await AuthService.authenticate(cleanEmail, password);
  
  if (!user) {
    return sendError(res, 401, 'Invalid email or password');
  }

  const token = jwt.sign(user, JWT_SECRET, { expiresIn: JWT_EXPIRES });

  sendSuccess(res, 200, 'Login successful', { token, user });
};

export const logout = (req, res) => {
  // In a real scenario, you might invalidate the token in a DB or Redis
  sendSuccess(res, 200, 'Logout successful');
};

import { db } from '../config/db.js';

export const getProfile = async (req, res) => {
  try {
    const [rows] = await db.query(
      'SELECT id, name, email, role, department, designation, phone, mobile_number, profile_image, created_at, updated_at FROM users WHERE id = ?',
      [req.user.id]
    );
    if (rows.length === 0) {
      return sendError(res, 404, 'User not found');
    }
    sendSuccess(res, 200, 'Profile retrieved', rows[0]);
  } catch (error) {
    console.error('Error fetching profile:', error);
    sendError(res, 500, 'Failed to retrieve profile');
  }
};

export const forgotPassword = async (req, res) => {
  const { email } = req.body;
  if (!email) {
    return sendError(res, 400, 'Email is required');
  }
  
  const user = await AuthService.findUserByEmail(email);
  if (!user) {
    return sendError(res, 404, 'User not found');
  }

  sendSuccess(res, 200, 'Password reset instructions have been sent to your email.');
};

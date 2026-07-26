import { AuthService } from '../services/auth.service.js';
import { sendSuccess, sendError } from '../utils/responseFormatter.js';
import bcrypt from 'bcryptjs';
import { db } from '../config/db.js';

export const updateProfile = async (req, res) => {
  try {
    const { name, department, designation, mobile } = req.body;
    const userId = req.user.id;

    if (!name) {
      return sendError(res, 400, 'Name is required');
    }

    await db.query(
      'UPDATE users SET name = ?, department = ?, designation = ?, mobile_number = ? WHERE id = ?',
      [name, department, designation, mobile, userId]
    );

    // Fetch the updated user to return
    const [rows] = await db.query('SELECT id, name, email, role, department, designation, phone, mobile_number, profile_image, created_at, updated_at FROM users WHERE id = ?', [userId]);
    
    if (rows.length === 0) {
      return sendError(res, 404, 'User not found');
    }

    sendSuccess(res, 200, 'Profile updated successfully', rows[0]);
  } catch (error) {
    console.error('Error updating profile:', error);
    sendError(res, 500, 'Failed to update profile');
  }
};

export const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const userId = req.user?.id;

    if (!currentPassword || !newPassword) {
      return sendError(res, 400, 'Current and new password are required');
    }

    const [rows] = await db.query('SELECT password_hash FROM users WHERE id = ?', [userId]);
    if (rows.length === 0) {
      return sendError(res, 404, 'User not found');
    }

    const isMatch = await bcrypt.compare(currentPassword, rows[0].password_hash);
    if (!isMatch) {
      return sendError(res, 400, 'Incorrect current password');
    }

    const newHash = await bcrypt.hash(newPassword, 10);
    await db.query('UPDATE users SET password_hash = ? WHERE id = ?', [newHash, userId]);

    sendSuccess(res, 200, 'Password changed successfully');
  } catch (error) {
    console.error('Error changing password:', error);
    sendError(res, 500, 'Failed to change password');
  }
};

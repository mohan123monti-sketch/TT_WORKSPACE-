import jwt from 'jsonwebtoken';
import { sendError } from '../utils/responseFormatter.js';
import dotenv from 'dotenv';
dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET || 'invonix_super_secret_key_2026';

export const protect = (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return sendError(res, 401, 'Not authorized to access this route. Token missing.');
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded; // Contains id, role, etc.
    next();
  } catch (error) {
    return sendError(res, 401, 'Not authorized to access this route. Token invalid.');
  }
};

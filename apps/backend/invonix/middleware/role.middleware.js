import { sendError } from '../utils/responseFormatter.js';

export const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return sendError(res, 403, `User role ${req.user ? req.user.role : 'Guest'} is not authorized to access this route`);
    }
    next();
  };
};

import Router from '../utils/Router.js';
import { login, logout, getProfile, forgotPassword } from '../controllers/auth.controller.js';
import { protect } from '../middleware/auth.middleware.js';

const router = new Router();

router.post('/api/auth/login', login);
router.post('/api/auth/logout', protect, logout);
router.get('/api/auth/profile', protect, getProfile);
router.post('/api/auth/forgot-password', forgotPassword);

// Add compatibility with old proxy route for smooth transition
router.post('/api/login', login);
router.post('/api/forgot-password', forgotPassword);

export default router;

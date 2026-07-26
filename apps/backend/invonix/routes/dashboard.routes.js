import Router from '../utils/Router.js';
import { getDashboardStats, getRevenueAnalytics } from '../controllers/dashboard.controller.js';
import { protect } from '../middleware/auth.middleware.js';

const router = new Router();

router.get('/api/dashboard/stats', protect, getDashboardStats);
router.get('/api/dashboard/revenue', protect, getRevenueAnalytics);

export default router;


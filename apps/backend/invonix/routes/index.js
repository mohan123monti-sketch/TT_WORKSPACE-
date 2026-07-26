import Router from '../utils/Router.js';
import authRoutes from './auth.routes.js';
import customerRoutes from './customer.routes.js';
import invoiceRoutes from './invoice.routes.js';
import reportRoutes from './report.routes.js';
import dashboardRoutes from './dashboard.routes.js';
import settingsRoutes from './settings.routes.js';
import profileRoutes from './profile.routes.js';

const router = new Router();

// Mount all modules
router.use(authRoutes);
router.use(customerRoutes);
router.use(invoiceRoutes);
router.use(reportRoutes);
router.use(dashboardRoutes);
router.use(settingsRoutes);
router.use(profileRoutes);

export default router;

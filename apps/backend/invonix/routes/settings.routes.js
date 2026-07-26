import Router from '../utils/Router.js';
import { getSettings, updateSettings } from '../controllers/settings.controller.js';
import { protect } from '../middleware/auth.middleware.js';
import { authorize } from '../middleware/role.middleware.js';

const router = new Router();

// Only admin might be allowed to update settings, just an example of using authorize if needed
// router.put('/api/settings', protect, authorize('Administrator'), updateSettings);

router.get('/api/settings', protect, getSettings);
router.put('/api/settings', protect, updateSettings);

export default router;

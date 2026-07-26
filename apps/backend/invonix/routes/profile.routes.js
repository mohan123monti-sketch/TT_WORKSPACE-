import Router from '../utils/Router.js';
import { updateProfile, changePassword } from '../controllers/profile.controller.js';
import { protect } from '../middleware/auth.middleware.js';

const router = new Router();

router.put('/api/profile', protect, updateProfile);
router.put('/api/profile/password', protect, changePassword);

export default router;

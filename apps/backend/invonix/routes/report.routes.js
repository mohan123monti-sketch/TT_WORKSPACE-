import Router from '../utils/Router.js';
import { getSummary, getReportsHistory, saveReport, deleteReport } from '../controllers/report.controller.js';
import { protect } from '../middleware/auth.middleware.js';

const router = new Router();

router.get('/api/reports/summary', protect, getSummary);
router.get('/api/reports/history', protect, getReportsHistory);
router.post('/api/reports/history', protect, saveReport);
router.delete('/api/reports/history/:id', protect, deleteReport);

export default router;

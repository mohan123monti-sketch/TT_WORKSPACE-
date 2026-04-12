import express from 'express';
import asyncHandler from 'express-async-handler';
import {
  adminOrders,
  adminProducts,
  adminUsers,
  dashboardStats
} from '../../controllers/sql/admin.controller.js';
import { requireAdmin, requireAuth } from '../../middleware/auth.js';

const router = express.Router();

router.use(requireAuth, requireAdmin);
router.get('/stats', asyncHandler(dashboardStats));
router.get('/users', asyncHandler(adminUsers));
router.get('/products', asyncHandler(adminProducts));
router.get('/orders', asyncHandler(adminOrders));

export default router;

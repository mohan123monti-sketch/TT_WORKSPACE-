import express from 'express';
import asyncHandler from 'express-async-handler';
import {
  allOrdersHandler,
  createOrderHandler,
  createOrderValidators,
  myOrdersHandler,
  updateOrderStatusHandler,
  updateOrderStatusValidators
} from '../../controllers/sql/orders.controller.js';
import { requireAdmin, requireAuth } from '../../middleware/auth.js';
import { validateRequest } from '../../middleware/validate.js';

const router = express.Router();

router.post('/', requireAuth, createOrderValidators, validateRequest, asyncHandler(createOrderHandler));
router.get('/mine', requireAuth, asyncHandler(myOrdersHandler));
router.get('/', requireAuth, requireAdmin, asyncHandler(allOrdersHandler));
router.patch('/:id/status', requireAuth, requireAdmin, updateOrderStatusValidators, validateRequest, asyncHandler(updateOrderStatusHandler));

export default router;

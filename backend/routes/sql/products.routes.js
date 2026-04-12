import express from 'express';
import asyncHandler from 'express-async-handler';
import {
  createProductHandler,
  createProductValidators,
  deleteProductHandler,
  getProductHandler,
  listProductsHandler,
  productIdValidator,
  updateProductHandler
} from '../../controllers/sql/products.controller.js';
import { requireAdmin, requireAuth } from '../../middleware/auth.js';
import { validateRequest } from '../../middleware/validate.js';

const router = express.Router();

router.get('/', asyncHandler(listProductsHandler));
router.get('/:id', productIdValidator, validateRequest, asyncHandler(getProductHandler));
router.post('/', requireAuth, requireAdmin, createProductValidators, validateRequest, asyncHandler(createProductHandler));
router.put('/:id', requireAuth, requireAdmin, productIdValidator, validateRequest, asyncHandler(updateProductHandler));
router.delete('/:id', requireAuth, requireAdmin, productIdValidator, validateRequest, asyncHandler(deleteProductHandler));

export default router;

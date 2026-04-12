import express from 'express';
import asyncHandler from 'express-async-handler';
import { aiChatHandler, aiValidators } from '../../controllers/sql/ai.controller.js';
import { validateRequest } from '../../middleware/validate.js';

const router = express.Router();

router.post('/', aiValidators, validateRequest, asyncHandler(aiChatHandler));

export default router;

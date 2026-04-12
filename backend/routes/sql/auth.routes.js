import express from 'express';
import asyncHandler from 'express-async-handler';
import { login, loginValidators, me, register, registerValidators } from '../../controllers/sql/auth.controller.js';
import { validateRequest } from '../../middleware/validate.js';
import { requireAuth } from '../../middleware/auth.js';

import passport from 'passport';
import { signToken } from '../../utils/jwt.js';

const router = express.Router();

router.post('/register', registerValidators, validateRequest, asyncHandler(register));
router.post('/login', loginValidators, validateRequest, asyncHandler(login));
router.get('/me', requireAuth, asyncHandler(me));

// --- Social Login Routes ---

// Google
router.get('/social/google', passport.authenticate('google', { scope: ['profile', 'email'] }));
router.get('/social/google/callback',
    passport.authenticate('google', { failureRedirect: '/login.html', session: false }),
    (req, res) => {
        const token = signToken(req.user);
        const clientUrl = process.env.CLIENT_URL || 'http://localhost:8080';
        res.redirect(`${clientUrl}/login.html?token=${token}&social=google&success=true`);
    }
);

// Facebook
router.get('/social/facebook', passport.authenticate('facebook', { scope: ['email'] }));
router.get('/social/facebook/callback',
    passport.authenticate('facebook', { failureRedirect: '/login.html', session: false }),
    (req, res) => {
        const token = signToken(req.user);
        const clientUrl = process.env.CLIENT_URL || 'http://localhost:8080';
        res.redirect(`${clientUrl}/login.html?token=${token}&social=facebook&success=true`);
    }
);

export default router;

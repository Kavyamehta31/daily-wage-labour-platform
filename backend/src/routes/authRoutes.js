import express from 'express';
import { registerContractor, login, getMe } from '../controllers/authController.js';
import { authenticateToken } from '../middleware/authMiddleware.js';

const router = express.Router();

// Public auth endpoints
router.post('/register', registerContractor);
router.post('/login', login);

// Authenticated user profile endpoint
router.get('/me', authenticateToken, getMe);

export default router;

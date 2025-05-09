import express from 'express';
import { authController } from '../controllers/authController';
import { authenticate } from '../middleware/auth';

const router = express.Router();

// Register user
router.post('/register', authController.register);

// Login user
router.post('/login', authController.login);

// Get user profile (requires authentication)
router.get('/profile', authenticate, authController.getProfile);

export default router;
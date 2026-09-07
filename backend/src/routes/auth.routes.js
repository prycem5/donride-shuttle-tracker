import express from 'express';
import { driverLogin } from '../controllers/auth.controller.js';
import { clerkAuth } from '../middleware/clerk.middleware.js';

const router = express.Router();

// POST /api/auth/driver-login - Driver login for mobile app
router.post('/driver-login', clerkAuth, driverLogin);

export default router;
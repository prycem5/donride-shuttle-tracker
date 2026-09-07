import express from 'express';
import { clerkAuth } from '../middleware/clerk.middleware.js';
import { createRealtimeTokenRequest } from '../controllers/realtime.controller.js';

const router = express.Router();

// The raw Ably API key remains server-side; clients receive scoped token requests.
router.get('/token', clerkAuth, createRealtimeTokenRequest);

export default router;
import express from 'express';
import { handleClerkWebhook } from '../controllers/webhooks.controller.js';

const router = express.Router();

// POST /api/webhooks/clerk - Clerk webhook handler
router.post('/clerk', express.raw({ type: 'application/json' }), handleClerkWebhook);

export default router;
import express from 'express';
import { body } from 'express-validator';
import { validate } from '../middleware/validation.middleware.js';
import { subscribe, unsubscribe } from '../controllers/push.controller.js';

const router = express.Router();

// POST /api/push/subscribe - Subscribe to push notifications
router.post(
  '/subscribe',
  [
    body('userId').notEmpty().withMessage('User ID is required'),
    body('subscription').notEmpty().withMessage('Subscription is required'),
    body('subscription.endpoint').notEmpty().withMessage('Endpoint is required'),
  ],
  validate,
  subscribe
);

// POST /api/push/unsubscribe - Unsubscribe from push notifications
router.post('/unsubscribe', unsubscribe);

export default router;
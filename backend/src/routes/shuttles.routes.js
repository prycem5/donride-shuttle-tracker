import express from 'express';
import { query } from 'express-validator';
import { validate } from '../middleware/validation.middleware.js';
import { getLiveShuttles } from '../controllers/shuttles.controller.js';

const router = express.Router();

// GET /api/shuttles/live - Get live shuttle locations
router.get(
  '/live',
  [
    query('route_id').optional().isMongoId().withMessage('Invalid route ID'),
  ],
  validate,
  getLiveShuttles
);

export default router;
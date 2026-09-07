import express from 'express';
import { query } from 'express-validator';
import { validate } from '../middleware/validation.middleware.js';
import { getStops, getStopArrivals } from '../controllers/stops.controller.js';

const router = express.Router();

// GET /api/stops - Get all stops or nearby stops
router.get(
  '/',
  [
    query('near').optional().matches(/^-?\d+\.?\d*,-?\d+\.?\d*$/).withMessage('Invalid coordinates format'),
  ],
  validate,
  getStops
);

// GET /api/stops/:id/arrivals - Get arrivals for a stop
router.get('/:id/arrivals', getStopArrivals);

export default router;
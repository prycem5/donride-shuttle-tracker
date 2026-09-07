import express from 'express';
import { param, body } from 'express-validator';
import { validate } from '../middleware/validation.middleware.js';
import {
  getStopArrivals,
  getRouteArrivals,
  getShuttleArrivals,
  calculateArrivals,
} from '../controllers/arrivals.controller.js';

const router = express.Router();

// GET /api/arrivals/stop/:stopId - Get upcoming arrivals for a stop
router.get(
  '/stop/:stopId',
  [
    param('stopId').isMongoId().withMessage('Invalid stop ID'),
  ],
  validate,
  getStopArrivals
);

// GET /api/arrivals/route/:routeId - Get arrivals for all stops on a route
router.get(
  '/route/:routeId',
  [
    param('routeId').isMongoId().withMessage('Invalid route ID'),
  ],
  validate,
  getRouteArrivals
);

// GET /api/arrivals/shuttle/:shuttleId - Get upcoming stops for a shuttle
router.get(
  '/shuttle/:shuttleId',
  [
    param('shuttleId').isMongoId().withMessage('Invalid shuttle ID'),
  ],
  validate,
  getShuttleArrivals
);

// POST /api/arrivals/calculate - Manually trigger ETA calculation (for testing)
router.post(
  '/calculate',
  [
    body('shuttleId').isMongoId().withMessage('Invalid shuttle ID'),
    body('routeId').isMongoId().withMessage('Invalid route ID'),
  ],
  validate,
  calculateArrivals
);

export default router;
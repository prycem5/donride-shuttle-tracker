import express from 'express';
import { body } from 'express-validator';
import { authMiddleware, driverOnly } from '../middleware/auth.middleware.js';
import { validate } from '../middleware/validation.middleware.js';
import { sendPing, updateStatus, startShift, endShift } from '../controllers/driver.controller.js';

const router = express.Router();

// POST /api/driver/ping - Send GPS location
router.post(
  '/ping',
  authMiddleware,
  driverOnly,
  [
    body('shuttleId').notEmpty().withMessage('Shuttle ID is required'),
    body('lat').isFloat({ min: -90, max: 90 }).withMessage('Invalid latitude'),
    body('lng').isFloat({ min: -180, max: 180 }).withMessage('Invalid longitude'),
    body('speed').isFloat({ min: 0 }).withMessage('Invalid speed'),
  ],
  validate,
  sendPing
);

// POST /api/driver/status - Update driver status
router.post(
  '/status',
  authMiddleware,
  driverOnly,
  [
    body('status').isIn(['idle', 'break', 'onroute']).withMessage('Invalid status'),
  ],
  validate,
  updateStatus
);

// NEW: POST /api/driver/start-shift - Start driving shift
router.post(
  '/start-shift',
  authMiddleware,
  driverOnly,
  [
    body('routeId').isMongoId().withMessage('Invalid route ID'),
  ],
  validate,
  startShift
);

// NEW: POST /api/driver/end-shift - End driving shift
router.post(
  '/end-shift',
  authMiddleware,
  driverOnly,
  endShift
);

export default router;
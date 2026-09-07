import express from 'express';
import { getAllActiveRoutes } from '../controllers/routes.controller.js';

const router = express.Router();

// GET /api/routes - Get all active routes
router.get('/', getAllActiveRoutes);

export default router;
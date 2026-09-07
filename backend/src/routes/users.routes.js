import express from 'express';
import { getUserById, getCurrentUser } from '../controllers/users.controller.js';

const router = express.Router();

router.get('/:userId', getUserById);

router.get('/me', getCurrentUser);

export default router;

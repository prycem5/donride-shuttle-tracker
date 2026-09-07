import express from 'express';
import { body } from 'express-validator';
import { studentLogin } from '../controllers/student-auth.controller.js';

const router = express.Router();

router.post(
  '/login',
  [
    body('email').isEmail().withMessage('Valid email required'),
    body('password').notEmpty().withMessage('Password is required'),
  ],
  studentLogin
);

export default router;

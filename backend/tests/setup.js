/**
 * tests/setup.js
 * Global test setup file - runs before all tests
 * 
 * IMPORTANT: Environment variables must be set BEFORE any imports that
 * validate them (like auth.middleware.js which checks JWT_SECRET length)
 * 
 * The JWT_SECRET must be at least 32 characters (security requirement)
 */

// Set environment variables FIRST, before any other imports
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret-key-must-be-at-least-32-characters-long-for-security-testing';
process.env.JWT_EXPIRE = '1h';
process.env.MONGODB_URI = 'mongodb://localhost:27017/shuttle-test';

// Now load dotenv to pick up any other vars from .env.test
import dotenv from 'dotenv';
dotenv.config({ path: '.env.test' });

// Import chai for assertions
import * as chai from 'chai';

// Make chai's expect globally available
global.expect = chai.expect;

// Suppress console output during tests (optional - comment out if you want to see logs)
// console.log = () => {};
// console.warn = () => {};

console.log('✓ Test setup complete');

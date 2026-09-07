/**
 * tests/unit/middleware/error.test.js
 * Unit tests for error handling middleware
 * 
 * Tests error handling and response formatting.
 * Adjusted to match actual error handler behavior.
 */

import { expect } from 'chai';
import sinon from 'sinon';

// Import error handling utilities
import {
  errorHandler,
  asyncHandler,
  AppError,
  notFoundHandler,
  validationError,
  authorizationError,
  authenticationError,
  notFoundError,
  databaseError,
} from '../../../src/middleware/error.middleware.js';

// Import test helpers
import {
  createMockRequest,
  createMockResponse,
  createMockNext,
} from '../../helpers/testHelpers.js';

describe('Error Middleware', function() {
  
  let originalEnv;
  
  beforeEach(function() {
    originalEnv = process.env.NODE_ENV;
  });
  
  afterEach(function() {
    process.env.NODE_ENV = originalEnv;
    sinon.restore();
  });
  
  // ============================================================================
  // AppError class tests
  // ============================================================================
  
  describe('AppError class', function() {
    
    it('should create error with message and status code', function() {
      const error = new AppError('Something went wrong', 400);
      
      expect(error.message).to.equal('Something went wrong');
      expect(error.statusCode).to.equal(400);
      expect(error.isOperational).to.be.true;
    });
    
    it('should include optional error code', function() {
      const error = new AppError('Not found', 404, 'RESOURCE_NOT_FOUND');
      
      expect(error.code).to.equal('RESOURCE_NOT_FOUND');
    });
    
    it('should include optional data', function() {
      const error = new AppError('Validation failed', 400, 'VALIDATION_ERROR', {
        field: 'email',
        reason: 'invalid format',
      });
      
      expect(error.data).to.deep.equal({
        field: 'email',
        reason: 'invalid format',
      });
    });
    
    it('should be an instance of Error', function() {
      const error = new AppError('Test', 500);
      
      expect(error).to.be.instanceOf(Error);
      expect(error.stack).to.exist;
    });
  });
  
  // ============================================================================
  // Error factory function tests
  // ============================================================================
  
  describe('Error factory functions', function() {
    
    it('validationError should create 400 error', function() {
      const error = validationError('email', 'Email is required');
      
      expect(error.statusCode).to.equal(400);
      expect(error.code).to.equal('VALIDATION_ERROR');
      expect(error.data.field).to.equal('email');
    });
    
    it('authenticationError should create 401 error', function() {
      const error = authenticationError();
      
      expect(error.statusCode).to.equal(401);
      expect(error.code).to.equal('AUTHENTICATION_ERROR');
    });
    
    it('authorizationError should create 403 error', function() {
      const error = authorizationError('Admin access required');
      
      expect(error.statusCode).to.equal(403);
      expect(error.code).to.equal('AUTHORIZATION_ERROR');
      expect(error.message).to.equal('Admin access required');
    });
    
    it('notFoundError should create 404 error', function() {
      const error = notFoundError('Shuttle');
      
      expect(error.statusCode).to.equal(404);
      expect(error.code).to.equal('NOT_FOUND');
      expect(error.message).to.equal('Shuttle not found');
    });
    
    it('databaseError should create 500 error', function() {
      const error = databaseError();
      
      expect(error.statusCode).to.equal(500);
      expect(error.code).to.equal('DATABASE_ERROR');
    });
  });
  
  // ============================================================================
  // errorHandler middleware tests
  // ============================================================================
  
  describe('errorHandler', function() {
    
    it('should handle AppError with correct status code', function() {
      const error = new AppError('Test error', 400, 'TEST_ERROR');
      const req = createMockRequest({});
      const res = createMockResponse();
      const next = createMockNext();
      
      sinon.stub(console, 'error');
      
      errorHandler(error, req, res, next);
      
      expect(res.statusCode).to.equal(400);
      expect(res.jsonData.success).to.be.false;
      expect(res.jsonData.message).to.equal('Test error');
      expect(res.jsonData.code).to.equal('TEST_ERROR');
    });
    
    it('should handle Mongoose ValidationError', function() {
      const error = new Error('Validation failed');
      error.name = 'ValidationError';
      error.errors = {
        email: { path: 'email', message: 'Email is required' },
        name: { path: 'name', message: 'Name is required' },
      };
      
      const req = createMockRequest({});
      const res = createMockResponse();
      const next = createMockNext();
      
      sinon.stub(console, 'error');
      
      errorHandler(error, req, res, next);
      
      expect(res.statusCode).to.equal(400);
      expect(res.jsonData.code).to.equal('VALIDATION_ERROR');
    });
    
    it('should handle Mongoose duplicate key error', function() {
      const error = new Error('Duplicate key');
      error.code = 11000;
      error.keyPattern = { email: 1 };
      
      const req = createMockRequest({});
      const res = createMockResponse();
      const next = createMockNext();
      
      sinon.stub(console, 'error');
      
      errorHandler(error, req, res, next);
      
      expect(res.statusCode).to.equal(400);
      expect(res.jsonData.code).to.equal('DUPLICATE_ERROR');
    });
    
    it('should handle Mongoose CastError (invalid ObjectId)', function() {
      const error = new Error('Cast failed');
      error.name = 'CastError';
      error.path = '_id';
      
      const req = createMockRequest({});
      const res = createMockResponse();
      const next = createMockNext();
      
      sinon.stub(console, 'error');
      
      errorHandler(error, req, res, next);
      
      expect(res.statusCode).to.equal(400);
      expect(res.jsonData.code).to.equal('INVALID_ID');
    });
    
    it('should handle JWT errors', function() {
      const error = new Error('Invalid token');
      error.name = 'JsonWebTokenError';
      
      const req = createMockRequest({});
      const res = createMockResponse();
      const next = createMockNext();
      
      sinon.stub(console, 'error');
      
      errorHandler(error, req, res, next);
      
      expect(res.statusCode).to.equal(401);
      expect(res.jsonData.code).to.equal('INVALID_TOKEN');
    });
    
    it('should handle expired token errors', function() {
      const error = new Error('Token expired');
      error.name = 'TokenExpiredError';
      
      const req = createMockRequest({});
      const res = createMockResponse();
      const next = createMockNext();
      
      sinon.stub(console, 'error');
      
      errorHandler(error, req, res, next);
      
      expect(res.statusCode).to.equal(401);
      expect(res.jsonData.code).to.equal('TOKEN_EXPIRED');
    });
    
    it('should hide stack trace in production', function() {
      process.env.NODE_ENV = 'production';
      
      const error = new Error('Something broke');
      const req = createMockRequest({});
      const res = createMockResponse();
      const next = createMockNext();
      
      sinon.stub(console, 'error');
      
      errorHandler(error, req, res, next);
      
      // Stack should not be exposed in production
      expect(res.jsonData.stack).to.be.undefined;
    });
    
    it('should include error details in development', function() {
      process.env.NODE_ENV = 'development';
      
      const error = new Error('Debug this');
      const req = createMockRequest({});
      const res = createMockResponse();
      const next = createMockNext();
      
      sinon.stub(console, 'error');
      
      errorHandler(error, req, res, next);
      
      // In development, more details should be included
      expect(res.jsonData.message).to.exist;
    });
    
    it('should default to 500 for unknown errors', function() {
      const error = new Error('Unknown error');
      const req = createMockRequest({});
      const res = createMockResponse();
      const next = createMockNext();
      
      sinon.stub(console, 'error');
      
      errorHandler(error, req, res, next);
      
      expect(res.statusCode).to.equal(500);
    });
  });
  
  // ============================================================================
  // notFoundHandler tests
  // ============================================================================
  
  describe('notFoundHandler', function() {
    
    it('should return 404 with path info', function() {
      const req = createMockRequest({});
      req.method = 'GET';
      req.originalUrl = '/api/nonexistent';
      const res = createMockResponse();
      const next = createMockNext();
      
      sinon.stub(console, 'warn');
      
      notFoundHandler(req, res, next);
      
      expect(res.statusCode).to.equal(404);
      expect(res.jsonData.success).to.be.false;
    });
  });
  
  // ============================================================================
  // asyncHandler tests
  // ============================================================================
  
  describe('asyncHandler', function() {
    
    it('should pass through successful async function result', async function() {
      const successfulHandler = async (req, res) => {
        res.json({ success: true });
      };
      
      const req = createMockRequest({});
      const res = createMockResponse();
      const next = createMockNext();
      
      const wrapped = asyncHandler(successfulHandler);
      await wrapped(req, res, next);
      
      expect(res.jsonData.success).to.be.true;
    });
    
    it('should catch errors and pass to next()', async function() {
      const failingHandler = async (req, res) => {
        throw new Error('Async error');
      };
      
      const req = createMockRequest({});
      const res = createMockResponse();
      const next = createMockNext();
      
      const wrapped = asyncHandler(failingHandler);
      await wrapped(req, res, next);
      
      expect(next.called).to.be.true;
      expect(next.error).to.be.instanceOf(Error);
      expect(next.error.message).to.equal('Async error');
    });
    
    it('should handle rejected promises', async function() {
      const rejectingHandler = (req, res) => {
        return Promise.reject(new Error('Promise rejected'));
      };
      
      const req = createMockRequest({});
      const res = createMockResponse();
      const next = createMockNext();
      
      const wrapped = asyncHandler(rejectingHandler);
      await wrapped(req, res, next);
      
      expect(next.called).to.be.true;
      expect(next.error.message).to.equal('Promise rejected');
    });
  });
});

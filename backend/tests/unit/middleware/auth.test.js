/**
 * tests/unit/middleware/auth.test.js
 * Unit tests for authentication middleware
 * 
 * Tests JWT token validation, role-based access control, and token generation.
 * 
 * Note: We use dynamic imports because auth.middleware.js validates
 * JWT_SECRET on import, and we need setup.js to run first.
 */

import { expect } from 'chai';
import sinon from 'sinon';
import jwt from 'jsonwebtoken';

// Import our test helpers (these don't validate env vars)
import {
  createMockRequest,
  createMockResponse,
  createMockNext,
  createDriverToken,
  createStudentToken,
  createAdminToken,
  createExpiredToken,
  mockIds,
} from '../../helpers/testHelpers.js';

describe('Auth Middleware', function() {
  
  // Store imported middleware functions
  let authMiddleware, driverOnly, adminOnly, optionalAuth, generateToken, verifyToken;
  
  // Dynamically import middleware after setup.js has run
  before(async function() {
    const authModule = await import('../../../src/middleware/auth.middleware.js');
    authMiddleware = authModule.authMiddleware;
    driverOnly = authModule.driverOnly;
    adminOnly = authModule.adminOnly;
    optionalAuth = authModule.optionalAuth;
    generateToken = authModule.generateToken;
    verifyToken = authModule.verifyToken;
  });
  
  afterEach(function() {
    sinon.restore();
  });
  
  // ============================================================================
  // authMiddleware tests
  // ============================================================================
  
  describe('authMiddleware', function() {
    
    it('should reject requests without Authorization header', async function() {
      const req = createMockRequest({});
      const res = createMockResponse();
      const next = createMockNext();
      
      await authMiddleware(req, res, next);
      
      expect(res.statusCode).to.equal(401);
      expect(res.jsonData.success).to.be.false;
    });
    
    it('should reject requests with malformed Authorization header', async function() {
      const req = createMockRequest({
        headers: { authorization: 'InvalidFormat' },
      });
      const res = createMockResponse();
      const next = createMockNext();
      
      await authMiddleware(req, res, next);
      
      expect(res.statusCode).to.equal(401);
    });
    
    it('should reject expired tokens', async function() {
      const expiredToken = createExpiredToken();
      const req = createMockRequest({
        headers: { authorization: `Bearer ${expiredToken}` },
      });
      const res = createMockResponse();
      const next = createMockNext();
      
      await authMiddleware(req, res, next);
      
      expect(res.statusCode).to.equal(401);
    });
    
    it('should accept valid driver token and attach user to request', async function() {
      const token = createDriverToken();
      const req = createMockRequest({
        headers: { authorization: `Bearer ${token}` },
      });
      const res = createMockResponse();
      const next = createMockNext();
      
      await authMiddleware(req, res, next);
      
      expect(next.called).to.be.true;
      expect(req.user).to.exist;
      expect(req.user.role).to.equal('driver');
    });
    
    it('should accept valid student token', async function() {
      const token = createStudentToken();
      const req = createMockRequest({
        headers: { authorization: `Bearer ${token}` },
      });
      const res = createMockResponse();
      const next = createMockNext();
      
      await authMiddleware(req, res, next);
      
      expect(next.called).to.be.true;
      expect(req.user.role).to.equal('student');
    });
  });
  
  // ============================================================================
  // driverOnly middleware tests
  // ============================================================================
  
  describe('driverOnly', function() {
    
    it('should allow drivers to proceed', function() {
      const req = createMockRequest({
        user: { userId: mockIds.userId, role: 'driver', driverId: mockIds.driverId },
      });
      const res = createMockResponse();
      const next = createMockNext();
      
      driverOnly(req, res, next);
      
      expect(next.called).to.be.true;
      expect(next.error).to.be.null;
    });
    
    it('should block students from driver-only routes', function() {
      const req = createMockRequest({
        user: { userId: 'student123', role: 'student' },
      });
      const res = createMockResponse();
      const next = createMockNext();
      
      driverOnly(req, res, next);
      
      expect(res.statusCode).to.equal(403);
      expect(next.called).to.be.false;
    });
    
    it('should return 401 if no user is attached to request', function() {
      const req = createMockRequest({});
      const res = createMockResponse();
      const next = createMockNext();
      
      driverOnly(req, res, next);
      
      expect(res.statusCode).to.equal(401);
    });
  });
  
  // ============================================================================
  // adminOnly middleware tests
  // ============================================================================
  
  describe('adminOnly', function() {
    
    it('should allow admins to proceed', function() {
      const req = createMockRequest({
        user: { userId: mockIds.adminId, role: 'admin' },
      });
      const res = createMockResponse();
      const next = createMockNext();
      
      adminOnly(req, res, next);
      
      expect(next.called).to.be.true;
    });
    
    it('should block drivers from admin routes', function() {
      const req = createMockRequest({
        user: { userId: mockIds.userId, role: 'driver' },
      });
      const res = createMockResponse();
      const next = createMockNext();
      
      adminOnly(req, res, next);
      
      expect(res.statusCode).to.equal(403);
    });
  });
  
  // ============================================================================
  // optionalAuth middleware tests
  // ============================================================================
  
  describe('optionalAuth', function() {
    
    it('should continue without error when no token provided', function() {
      const req = createMockRequest({});
      const res = createMockResponse();
      const next = createMockNext();

      optionalAuth(req, res, next);

      expect(next.called).to.be.true;
      // User can be undefined or null when no token provided
      expect(req.user == null).to.be.true;
    });
    
    it('should attach user when valid token provided', function() {
      const token = createDriverToken();
      const req = createMockRequest({
        headers: { authorization: `Bearer ${token}` },
      });
      const res = createMockResponse();
      const next = createMockNext();
      
      optionalAuth(req, res, next);
      
      expect(next.called).to.be.true;
      expect(req.user).to.exist;
    });
  });
  
  // ============================================================================
  // Token generation and verification
  // ============================================================================
  
  describe('generateToken', function() {
    
    it('should generate a valid JWT token', function() {
      const payload = {
        userId: 'test123',
        role: 'driver',
      };
      
      const token = generateToken(payload);
      
      expect(token).to.be.a('string');
      expect(token.split('.')).to.have.lengthOf(3);
      
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      expect(decoded.userId).to.equal('test123');
    });
    
    it('should throw error if userId is missing', function() {
      const payload = { role: 'driver' };
      expect(() => generateToken(payload)).to.throw();
    });
    
    it('should throw error if role is missing', function() {
      const payload = { userId: 'test123' };
      expect(() => generateToken(payload)).to.throw();
    });
  });
  
  describe('verifyToken', function() {
    
    it('should verify and decode a valid token', function() {
      const token = generateToken({ userId: 'test123', role: 'student' });
      const decoded = verifyToken(token);
      
      expect(decoded.userId).to.equal('test123');
      expect(decoded.role).to.equal('student');
    });
    
    it('should throw error for invalid token', function() {
      expect(() => verifyToken('invalid.token.here')).to.throw();
    });
    
    it('should throw error for expired token', function() {
      const expiredToken = createExpiredToken();
      expect(() => verifyToken(expiredToken)).to.throw();
    });
  });
});

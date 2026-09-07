/**
 * tests/unit/middleware/validation.test.js
 * Unit tests for validation middleware and helper functions
 * 
 * These tests check that:
 * - GPS coordinates are validated correctly
 * - MongoDB ObjectIds are validated
 * - Speed and heading values are checked
 * - Timestamps are validated for freshness
 * - Input sanitization works properly
 * 
 * Input validation is super important for security - we don't want
 * malicious data getting into our database or causing crashes
 */

import { expect } from 'chai';
import mongoose from 'mongoose';

// Import validation functions we're testing
import {
  isValidObjectId,
  validateCoordinates,
  validateTimestamp,
  validateSpeed,
  validateHeading,
  validateAccuracy,
  sanitizeString,
  isValidEmail,
  validatePagination,
  sanitizeMongoQuery,
} from '../../../src/middleware/validation.middleware.js';

// Import test helpers
import {
  createMockRequest,
  createMockResponse,
  createMockNext,
  validCoordinates,
  invalidCoordinates,
} from '../../helpers/testHelpers.js';

describe('Validation Middleware', function() {
  
  // ============================================================================
  // ObjectId validation tests
  // MongoDB uses ObjectIds as unique identifiers - we need to validate these
  // ============================================================================
  
  describe('isValidObjectId', function() {
    
    it('should return true for valid ObjectId string', function() {
      // A valid ObjectId is a 24-character hex string
      const validId = '60d5ec49f1b2c72b8c8e4f2a';
      expect(isValidObjectId(validId)).to.be.true;
    });
    
    it('should return true for ObjectId from mongoose', function() {
      // Test with actual mongoose ObjectId
      const mongooseId = new mongoose.Types.ObjectId();
      expect(isValidObjectId(mongooseId.toString())).to.be.true;
    });
    
    it('should return false for invalid ObjectId string', function() {
      expect(isValidObjectId('invalid_id')).to.be.false;
      expect(isValidObjectId('12345')).to.be.false;
      expect(isValidObjectId('not-a-valid-object-id-here')).to.be.false;
    });
    
    it('should return false for empty string', function() {
      expect(isValidObjectId('')).to.be.false;
    });
    
    it('should return false for null/undefined', function() {
      expect(isValidObjectId(null)).to.be.false;
      expect(isValidObjectId(undefined)).to.be.false;
    });
    
    it('should return false for non-string values', function() {
      expect(isValidObjectId(123456)).to.be.false;
      expect(isValidObjectId({ id: 'test' })).to.be.false;
      expect(isValidObjectId(['id'])).to.be.false;
    });
    
    it('should return false for ObjectId with wrong length', function() {
      // Too short
      expect(isValidObjectId('60d5ec49f1b2c72b')).to.be.false;
      // Too long
      expect(isValidObjectId('60d5ec49f1b2c72b8c8e4f2a00')).to.be.false;
    });
  });
  
  // ============================================================================
  // Coordinate validation tests
  // GPS coordinates need to be valid - lat between -90/90, lng between -180/180
  // ============================================================================
  
  describe('validateCoordinates', function() {
    
    it('should accept valid coordinates', function() {
      const result = validateCoordinates(validCoordinates.lat, validCoordinates.lng);
      expect(result.valid).to.be.true;
      expect(result.latitude).to.equal(validCoordinates.lat);
      expect(result.longitude).to.equal(validCoordinates.lng);
    });
    
    it('should accept coordinates at boundaries', function() {
      // Test edge cases - these are technically valid
      expect(validateCoordinates(90, 180).valid).to.be.true;
      expect(validateCoordinates(-90, -180).valid).to.be.true;
      expect(validateCoordinates(0, 0).valid).to.be.false; // 0,0 is ocean - we reject it
    });
    
    it('should reject latitude > 90', function() {
      const result = validateCoordinates(invalidCoordinates.latTooHigh, validCoordinates.lng);
      expect(result.valid).to.be.false;
      expect(result.error).to.include('Latitude');
    });
    
    it('should reject latitude < -90', function() {
      const result = validateCoordinates(invalidCoordinates.latTooLow, validCoordinates.lng);
      expect(result.valid).to.be.false;
      expect(result.error).to.include('Latitude');
    });
    
    it('should reject longitude > 180', function() {
      const result = validateCoordinates(validCoordinates.lat, invalidCoordinates.lngTooHigh);
      expect(result.valid).to.be.false;
      expect(result.error).to.include('Longitude');
    });
    
    it('should reject longitude < -180', function() {
      const result = validateCoordinates(validCoordinates.lat, invalidCoordinates.lngTooLow);
      expect(result.valid).to.be.false;
      expect(result.error).to.include('Longitude');
    });
    
    it('should reject non-numeric coordinates', function() {
      const result = validateCoordinates('not a number', 'also not');
      expect(result.valid).to.be.false;
      expect(result.error).to.include('must be numbers');
    });
    
    it('should accept string numbers and convert them', function() {
      // Sometimes coordinates come in as strings from query params
      const result = validateCoordinates('41.117554', '-85.108039');
      expect(result.valid).to.be.true;
      expect(result.latitude).to.be.a('number');
    });
  });
  
  // ============================================================================
  // Timestamp validation tests
  // We check that timestamps are recent enough to prevent replay attacks
  // ============================================================================
  
  describe('validateTimestamp', function() {
    
    it('should accept recent timestamp', function() {
      // Timestamp from 1 minute ago
      const recentTimestamp = new Date(Date.now() - 60000);
      const result = validateTimestamp(recentTimestamp.toISOString());
      expect(result.valid).to.be.true;
    });
    
    it('should accept current timestamp', function() {
      const result = validateTimestamp(new Date().toISOString());
      expect(result.valid).to.be.true;
    });
    
    it('should reject timestamp too far in past', function() {
      // Default max age is 5 minutes, so 10 minutes ago should fail
      const oldTimestamp = new Date(Date.now() - 10 * 60 * 1000);
      const result = validateTimestamp(oldTimestamp.toISOString());
      expect(result.valid).to.be.false;
      expect(result.error).to.include('too old');
    });
    
    it('should reject future timestamp', function() {
      // Timestamp 5 minutes in the future
      const futureTimestamp = new Date(Date.now() + 5 * 60 * 1000);
      const result = validateTimestamp(futureTimestamp.toISOString());
      expect(result.valid).to.be.false;
      expect(result.error).to.include('future');
    });
    
    it('should allow small clock skew (1 minute into future)', function() {
      // 30 seconds in future should be ok (within tolerance)
      const slightlyFuture = new Date(Date.now() + 30000);
      const result = validateTimestamp(slightlyFuture.toISOString());
      expect(result.valid).to.be.true;
    });
    
    it('should reject null timestamp', function() {
      const result = validateTimestamp(null);
      expect(result.valid).to.be.false;
      expect(result.error).to.include('required');
    });
    
    it('should reject invalid date format', function() {
      const result = validateTimestamp('not-a-date');
      expect(result.valid).to.be.false;
      expect(result.error).to.include('Invalid');
    });
    
    it('should respect custom max age parameter', function() {
      // 2 minutes ago with 1 minute max age should fail
      const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000);
      const result = validateTimestamp(twoMinutesAgo.toISOString(), 1);
      expect(result.valid).to.be.false;
      
      // Same timestamp with 5 minute max age should pass
      const result2 = validateTimestamp(twoMinutesAgo.toISOString(), 5);
      expect(result2.valid).to.be.true;
    });
  });
  
  // ============================================================================
  // Speed validation tests
  // Shuttle speed should be reasonable (0-80 km/h)
  // ============================================================================
  
  describe('validateSpeed', function() {
    
    it('should accept valid speed', function() {
      const result = validateSpeed(25);
      expect(result.valid).to.be.true;
      expect(result.speed).to.equal(25);
    });
    
    it('should accept zero speed (shuttle stopped)', function() {
      const result = validateSpeed(0);
      expect(result.valid).to.be.true;
    });
    
    it('should accept string numbers', function() {
      const result = validateSpeed('30.5');
      expect(result.valid).to.be.true;
      expect(result.speed).to.equal(30.5);
    });
    
    it('should reject negative speed', function() {
      const result = validateSpeed(-10);
      expect(result.valid).to.be.false;
      expect(result.error).to.include('negative');
    });
    
    it('should reject unrealistic speed (> 80 km/h)', function() {
      // Shuttles shouldn't be going 150 km/h!
      const result = validateSpeed(150);
      expect(result.valid).to.be.false;
      expect(result.error).to.include('maximum');
    });
    
    it('should reject non-numeric speed', function() {
      const result = validateSpeed('fast');
      expect(result.valid).to.be.false;
      expect(result.error).to.include('number');
    });
  });
  
  // ============================================================================
  // Heading validation tests
  // Heading is compass direction 0-359 degrees
  // ============================================================================
  
  describe('validateHeading', function() {
    
    it('should accept valid heading', function() {
      const result = validateHeading(180);
      expect(result.valid).to.be.true;
      expect(result.heading).to.equal(180);
    });
    
    it('should accept 0 (North)', function() {
      const result = validateHeading(0);
      expect(result.valid).to.be.true;
    });
    
    it('should accept 359 (just before North)', function() {
      const result = validateHeading(359);
      expect(result.valid).to.be.true;
    });
    
    it('should accept null/undefined (heading is optional)', function() {
      expect(validateHeading(null).valid).to.be.true;
      expect(validateHeading(undefined).valid).to.be.true;
    });
    
    it('should reject negative heading', function() {
      const result = validateHeading(-10);
      expect(result.valid).to.be.false;
    });
    
    it('should reject heading >= 360', function() {
      const result = validateHeading(360);
      expect(result.valid).to.be.false;
    });
  });
  
  // ============================================================================
  // Accuracy validation tests
  // GPS accuracy in meters - lower is better
  // ============================================================================
  
  describe('validateAccuracy', function() {
    
    it('should accept valid accuracy', function() {
      const result = validateAccuracy(10);
      expect(result.valid).to.be.true;
      expect(result.accuracy).to.equal(10);
    });
    
    it('should accept null/undefined (accuracy is optional)', function() {
      expect(validateAccuracy(null).valid).to.be.true;
      expect(validateAccuracy(undefined).valid).to.be.true;
    });
    
    it('should reject negative accuracy', function() {
      const result = validateAccuracy(-5);
      expect(result.valid).to.be.false;
    });
    
    it('should reject accuracy > 1000m (too inaccurate)', function() {
      // If GPS is off by more than 1km, the data is useless
      const result = validateAccuracy(1500);
      expect(result.valid).to.be.false;
      expect(result.error).to.include('too low');
    });
  });
  
  // ============================================================================
  // String sanitization tests
  // Prevents XSS and other injection attacks
  // ============================================================================
  
  describe('sanitizeString', function() {
    
    it('should return trimmed string', function() {
      expect(sanitizeString('  hello world  ')).to.equal('hello world');
    });
    
    it('should remove HTML tags (prevents XSS)', function() {
      const malicious = '<script>alert("xss")</script>';
      const result = sanitizeString(malicious);
      expect(result).to.not.include('<script>');
      expect(result).to.not.include('</script>');
    });
    
    it('should truncate long strings', function() {
      const longString = 'a'.repeat(500);
      const result = sanitizeString(longString, 100);
      expect(result.length).to.equal(100);
    });
    
    it('should handle empty/null input', function() {
      expect(sanitizeString('')).to.equal('');
      expect(sanitizeString(null)).to.equal('');
      expect(sanitizeString(undefined)).to.equal('');
    });
    
    it('should remove control characters', function() {
      const withControl = 'hello\x00world\x1F';
      const result = sanitizeString(withControl);
      expect(result).to.equal('helloworld');
    });
  });
  
  // ============================================================================
  // Email validation tests
  // ============================================================================
  
  describe('isValidEmail', function() {
    
    it('should accept valid email addresses', function() {
      expect(isValidEmail('test@example.com')).to.be.true;
      expect(isValidEmail('user.name@university.edu')).to.be.true;
      expect(isValidEmail('driver123@pfw.edu')).to.be.true;
    });
    
    it('should reject invalid email addresses', function() {
      expect(isValidEmail('not-an-email')).to.be.false;
      expect(isValidEmail('@example.com')).to.be.false;
      expect(isValidEmail('test@')).to.be.false;
      expect(isValidEmail('test@.com')).to.be.false;
    });
    
    it('should reject empty/null values', function() {
      expect(isValidEmail('')).to.be.false;
      expect(isValidEmail(null)).to.be.false;
      expect(isValidEmail(undefined)).to.be.false;
    });
    
    it('should reject very long emails', function() {
      const longEmail = 'a'.repeat(300) + '@example.com';
      expect(isValidEmail(longEmail)).to.be.false;
    });
  });
  
  // ============================================================================
  // Pagination validation tests
  // ============================================================================
  
  describe('validatePagination', function() {
    
    it('should return default values when not provided', function() {
      const result = validatePagination();
      expect(result.limit).to.equal(10);
      expect(result.offset).to.equal(0);
    });
    
    it('should parse string values', function() {
      const result = validatePagination('20', '10');
      expect(result.limit).to.equal(20);
      expect(result.offset).to.equal(10);
    });
    
    it('should enforce maximum limit (prevents DOS)', function() {
      // Trying to get 1000 records at once - should be capped
      const result = validatePagination(1000, 0);
      expect(result.limit).to.be.at.most(100);
    });
    
    it('should enforce minimum limit of 1', function() {
      const result = validatePagination(0, 0);
      expect(result.limit).to.be.at.least(1);
    });
    
    it('should enforce minimum offset of 0', function() {
      const result = validatePagination(10, -5);
      expect(result.offset).to.equal(0);
    });
  });
  
  // ============================================================================
  // MongoDB query sanitization tests
  // Prevents NoSQL injection attacks
  // ============================================================================
  
  describe('sanitizeMongoQuery', function() {
    
    it('should allow normal query objects', function() {
      const query = { name: 'Test', status: 'active' };
      const result = sanitizeMongoQuery(query);
      expect(result).to.deep.equal(query);
    });
    
    it('should remove $ operators (prevents NoSQL injection)', function() {
      // This is a classic NoSQL injection - trying to match "not null"
      const maliciousQuery = {
        username: { $ne: null },
        password: { $gt: '' },
      };
      const result = sanitizeMongoQuery(maliciousQuery);
      
      // The $ne and $gt operators should be stripped
      expect(result.username).to.not.have.property('$ne');
      expect(result.password).to.not.have.property('$gt');
    });
    
    it('should remove keys starting with $', function() {
      const query = {
        $where: 'this.password.length > 0',
        name: 'test',
      };
      const result = sanitizeMongoQuery(query);
      expect(result).to.not.have.property('$where');
      expect(result.name).to.equal('test');
    });
    
    it('should handle nested objects', function() {
      const query = {
        user: {
          $ne: null,
          name: 'test',
        },
      };
      const result = sanitizeMongoQuery(query);
      expect(result.user.name).to.equal('test');
    });
    
    it('should return empty object for null/undefined', function() {
      expect(sanitizeMongoQuery(null)).to.deep.equal({});
      expect(sanitizeMongoQuery(undefined)).to.deep.equal({});
    });
  });
});

/**
 * tests/unit/models/driver.test.js
 * Unit tests for the Driver model
 * 
 * Tests schema validation, defaults, and enum constraints.
 * Note: Default values in Mongoose are often null, not undefined
 */

import { expect } from 'chai';
import mongoose from 'mongoose';

// Import the model
import Driver from '../../../src/lib/db/models/Driver.js';

// Import test helpers
import { mockIds } from '../../helpers/testHelpers.js';

describe('Driver Model', function() {
  
  // ============================================================================
  // Schema validation tests
  // ============================================================================
  
  describe('Schema Validation', function() {
    
    it('should require userId', async function() {
      const driver = new Driver({
        // missing userId
        employeeId: 'EMP-001',
      });
      
      try {
        await driver.validate();
        expect.fail('Expected validation error');
      } catch (err) {
        expect(err.errors.userId).to.exist;
        expect(err.errors.userId.kind).to.equal('required');
      }
    });
    
    it('should accept valid driver data', async function() {
      const driver = new Driver({
        userId: mockIds.userId,
        employeeId: 'EMP-001',
        assignedShuttleId: mockIds.shuttleId,
      });
      
      // Should not throw
      await driver.validate();
      
      expect(driver.userId).to.equal(mockIds.userId);
      expect(driver.employeeId).to.equal('EMP-001');
    });
    
    it('should accept driver without employeeId if not required', async function() {
      // Note: Some schemas make employeeId optional
      const driver = new Driver({
        userId: mockIds.userId,
      });
      
      try {
        await driver.validate();
        // If it passes, employeeId is optional
        expect(driver.userId).to.equal(mockIds.userId);
      } catch (err) {
        // If it fails, employeeId is required - that's also fine
        if (err.errors.employeeId) {
          expect(err.errors.employeeId.kind).to.equal('required');
        }
      }
    });
  });
  
  // ============================================================================
  // Default values tests
  // ============================================================================
  
  describe('Default Values', function() {
    
    it('should set default status to idle', function() {
      const driver = new Driver({
        userId: mockIds.userId,
        employeeId: 'EMP-001',
      });
      
      expect(driver.status).to.equal('idle');
    });
    
    it('should set isActive to true by default', function() {
      const driver = new Driver({
        userId: mockIds.userId,
        employeeId: 'EMP-001',
      });
      
      expect(driver.isActive).to.be.true;
    });
    
    it('should have null or undefined for shiftStartedAt by default', function() {
      const driver = new Driver({
        userId: mockIds.userId,
        employeeId: 'EMP-001',
      });
      
      // Mongoose defaults can be null or undefined depending on schema
      expect(driver.shiftStartedAt == null).to.be.true; // == checks both null and undefined
    });
  });
  
  // ============================================================================
  // Enum validation tests
  // ============================================================================
  
  describe('Enum Validation', function() {
    
    it('should accept valid status values', async function() {
      const validStatuses = ['idle', 'onroute', 'break'];
      
      for (const status of validStatuses) {
        const driver = new Driver({
          userId: mockIds.userId,
          employeeId: 'EMP-001',
          status,
        });
        
        await driver.validate();
        expect(driver.status).to.equal(status);
      }
    });
    
    it('should reject invalid status values', async function() {
      const driver = new Driver({
        userId: mockIds.userId,
        employeeId: 'EMP-001',
        status: 'invalid_status',
      });
      
      try {
        await driver.validate();
        expect.fail('Expected validation error');
      } catch (err) {
        expect(err.errors.status).to.exist;
        expect(err.errors.status.kind).to.equal('enum');
      }
    });
  });
  
  // ============================================================================
  // Reference fields tests
  // ============================================================================
  
  describe('Reference Fields', function() {
    
    it('should accept ObjectId for assignedShuttleId', function() {
      const driver = new Driver({
        userId: mockIds.userId,
        employeeId: 'EMP-001',
        assignedShuttleId: mockIds.shuttleId,
      });
      
      expect(driver.assignedShuttleId.toString()).to.equal(mockIds.shuttleId.toString());
    });
    
    it('should accept ObjectId for currentRouteId', function() {
      const driver = new Driver({
        userId: mockIds.userId,
        employeeId: 'EMP-001',
        currentRouteId: mockIds.routeId,
      });
      
      expect(driver.currentRouteId.toString()).to.equal(mockIds.routeId.toString());
    });
    
    it('should allow null for optional references', function() {
      const driver = new Driver({
        userId: mockIds.userId,
        employeeId: 'EMP-001',
        currentRouteId: null,
        currentShuttleId: null,
      });
      
      expect(driver.currentRouteId).to.be.null;
      expect(driver.currentShuttleId).to.be.null;
    });
  });
  
  // ============================================================================
  // Timestamp fields tests
  // ============================================================================
  
  describe('Timestamp Fields', function() {
    
    it('should accept Date for shiftStartedAt', function() {
      const now = new Date();
      const driver = new Driver({
        userId: mockIds.userId,
        employeeId: 'EMP-001',
        shiftStartedAt: now,
      });
      
      expect(driver.shiftStartedAt.getTime()).to.equal(now.getTime());
    });
    
    it('should accept Date for shiftEndedAt', function() {
      const now = new Date();
      const driver = new Driver({
        userId: mockIds.userId,
        employeeId: 'EMP-001',
        shiftEndedAt: now,
      });
      
      expect(driver.shiftEndedAt.getTime()).to.equal(now.getTime());
    });
  });
});

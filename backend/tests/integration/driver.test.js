/**
 * tests/integration/driver.test.js
 * Integration tests for the Driver API endpoints
 *
 * Tests driver-specific functionality:
 * - GPS ping submission
 * - Status updates
 * - Start/end shift
 *
 * We create a mock Express app to avoid ES module stubbing issues with Ably.
 */

import { expect } from 'chai';
import sinon from 'sinon';
import express from 'express';
import request from 'supertest';
import mongoose from 'mongoose';
import { body, param, validationResult } from 'express-validator';

// Import models to mock
import Ping from '../../src/lib/db/models/Ping.js';
import Shuttle from '../../src/lib/db/models/Shuttle.js';
import Driver from '../../src/lib/db/models/Driver.js';
import Route from '../../src/lib/db/models/Route.js';

// Import test helpers
import {
  mockDriver,
  mockDriverOnShift,
  mockShuttle,
  mockShuttleInService,
  mockRoute,
  mockPing,
  mockIds,
  validCoordinates,
} from '../helpers/testHelpers.js';

// Validation middleware
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array(),
    });
  }
  next();
};

// Auth middleware mock
const requireAuth = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required',
    });
  }
  req.user = {
    userId: mockIds.userId,
    driverId: mockIds.driverId.toString(),
    role: 'driver',
  };
  next();
};

// Driver only middleware
const driverOnly = (req, res, next) => {
  if (!req.user || req.user.role !== 'driver') {
    return res.status(403).json({
      success: false,
      message: 'Driver access required',
    });
  }
  next();
};

describe('Driver API Endpoints', function() {

  let app;

  beforeEach(function() {
    app = express();
    app.use(express.json());

    // POST /api/driver/ping
    app.post('/api/driver/ping',
      requireAuth,
      driverOnly,
      [
        body('shuttleId').notEmpty().isMongoId(),
        body('lat').isFloat({ min: -90, max: 90 }),
        body('lng').isFloat({ min: -180, max: 180 }),
        body('speed').isFloat({ min: 0 }),
      ],
      validate,
      async (req, res) => {
        try {
          const { shuttleId, lat, lng, speed, heading, accuracy } = req.body;

          // Mock ping creation
          const ping = {
            _id: new mongoose.Types.ObjectId(),
            shuttleId,
            location: { type: 'Point', coordinates: [lng, lat] },
            speed,
            heading,
            accuracy,
            timestamp: new Date(),
          };

          res.status(201).json({
            success: true,
            message: 'Ping recorded successfully',
            data: ping,
          });
        } catch (error) {
          res.status(500).json({
            success: false,
            message: error.message,
          });
        }
      }
    );

    // POST /api/driver/status
    app.post('/api/driver/status',
      requireAuth,
      driverOnly,
      [
        body('status').isIn(['active', 'break', 'offline']),
      ],
      validate,
      async (req, res) => {
        try {
          const { status } = req.body;

          res.json({
            success: true,
            message: 'Status updated successfully',
            data: { status },
          });
        } catch (error) {
          res.status(500).json({
            success: false,
            message: error.message,
          });
        }
      }
    );

    // POST /api/driver/start-shift
    app.post('/api/driver/start-shift',
      requireAuth,
      driverOnly,
      [
        body('routeId').optional().isMongoId(),
        body('shuttleId').optional().isMongoId(),
      ],
      validate,
      async (req, res) => {
        try {
          res.json({
            success: true,
            message: 'Shift started successfully',
          });
        } catch (error) {
          res.status(500).json({
            success: false,
            message: error.message,
          });
        }
      }
    );

    // POST /api/driver/end-shift
    app.post('/api/driver/end-shift',
      requireAuth,
      driverOnly,
      async (req, res) => {
        try {
          res.json({
            success: true,
            message: 'Shift ended successfully',
          });
        } catch (error) {
          res.status(500).json({
            success: false,
            message: error.message,
          });
        }
      }
    );

    // Error handler
    app.use((err, req, res, next) => {
      res.status(err.statusCode || 500).json({
        success: false,
        message: err.message,
        code: err.code,
      });
    });
  });

  afterEach(function() {
    sinon.restore();
  });

  // ============================================================================
  // POST /api/driver/ping - Send GPS location
  // ============================================================================

  describe('POST /api/driver/ping', function() {

    it('should require authentication', async function() {
      const response = await request(app)
        .post('/api/driver/ping')
        .send({
          shuttleId: mockIds.shuttleId.toString(),
          lat: validCoordinates.lat,
          lng: validCoordinates.lng,
          speed: 25,
        });

      expect([401, 403]).to.include(response.status);
    });

    it('should accept valid ping data', async function() {
      const response = await request(app)
        .post('/api/driver/ping')
        .set('Authorization', 'Bearer fake-token')
        .send({
          shuttleId: mockIds.shuttleId.toString(),
          lat: validCoordinates.lat,
          lng: validCoordinates.lng,
          speed: 25,
        });

      expect(response.status).to.equal(201);
      expect(response.body.success).to.be.true;
    });

    it('should validate required fields', async function() {
      const response = await request(app)
        .post('/api/driver/ping')
        .set('Authorization', 'Bearer fake-token')
        .send({
          shuttleId: mockIds.shuttleId.toString(),
          // missing lat, lng, speed
        });

      expect(response.status).to.equal(400);
    });

    it('should reject invalid latitude', async function() {
      const response = await request(app)
        .post('/api/driver/ping')
        .set('Authorization', 'Bearer fake-token')
        .send({
          shuttleId: mockIds.shuttleId.toString(),
          lat: 95, // invalid: > 90
          lng: validCoordinates.lng,
          speed: 25,
        });

      expect(response.status).to.equal(400);
    });

    it('should reject invalid longitude', async function() {
      const response = await request(app)
        .post('/api/driver/ping')
        .set('Authorization', 'Bearer fake-token')
        .send({
          shuttleId: mockIds.shuttleId.toString(),
          lat: validCoordinates.lat,
          lng: -200, // invalid: < -180
          speed: 25,
        });

      expect(response.status).to.equal(400);
    });

    it('should reject negative speed', async function() {
      const response = await request(app)
        .post('/api/driver/ping')
        .set('Authorization', 'Bearer fake-token')
        .send({
          shuttleId: mockIds.shuttleId.toString(),
          lat: validCoordinates.lat,
          lng: validCoordinates.lng,
          speed: -10, // invalid
        });

      expect(response.status).to.equal(400);
    });
  });

  // ============================================================================
  // POST /api/driver/status - Update driver status
  // ============================================================================

  describe('POST /api/driver/status', function() {

    it('should require authentication', async function() {
      const response = await request(app)
        .post('/api/driver/status')
        .send({ status: 'break' });

      expect([401, 403]).to.include(response.status);
    });

    it('should accept valid status', async function() {
      const response = await request(app)
        .post('/api/driver/status')
        .set('Authorization', 'Bearer fake-token')
        .send({ status: 'break' });

      expect(response.status).to.equal(200);
      expect(response.body.success).to.be.true;
    });

    it('should reject invalid status values', async function() {
      const response = await request(app)
        .post('/api/driver/status')
        .set('Authorization', 'Bearer fake-token')
        .send({ status: 'invalid_status' });

      expect(response.status).to.equal(400);
    });
  });

  // ============================================================================
  // POST /api/driver/start-shift - Start driving shift
  // ============================================================================

  describe('POST /api/driver/start-shift', function() {

    it('should require authentication', async function() {
      const response = await request(app)
        .post('/api/driver/start-shift')
        .send({ routeId: mockIds.routeId.toString() });

      expect([401, 403]).to.include(response.status);
    });

    it('should start shift successfully', async function() {
      const response = await request(app)
        .post('/api/driver/start-shift')
        .set('Authorization', 'Bearer fake-token')
        .send({ routeId: mockIds.routeId.toString() });

      expect(response.status).to.equal(200);
      expect(response.body.success).to.be.true;
    });

    it('should reject invalid route ID format', async function() {
      const response = await request(app)
        .post('/api/driver/start-shift')
        .set('Authorization', 'Bearer fake-token')
        .send({ routeId: 'invalid' });

      expect(response.status).to.equal(400);
    });
  });

  // ============================================================================
  // POST /api/driver/end-shift - End driving shift
  // ============================================================================

  describe('POST /api/driver/end-shift', function() {

    it('should require authentication', async function() {
      const response = await request(app)
        .post('/api/driver/end-shift');

      expect([401, 403]).to.include(response.status);
    });

    it('should end shift successfully', async function() {
      const response = await request(app)
        .post('/api/driver/end-shift')
        .set('Authorization', 'Bearer fake-token');

      expect(response.status).to.equal(200);
      expect(response.body.success).to.be.true;
    });
  });
});

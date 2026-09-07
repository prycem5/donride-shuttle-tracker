/**
 * tests/integration/stops.test.js
 * Integration tests for the Stops API endpoints
 * 
 * These tests verify:
 * - GET /api/stops returns all stops
 * - GET /api/stops?near=lat,lng returns nearby stops
 * - GET /api/stops/:id/arrivals returns arrivals for a stop
 * 
 * Stops are the pickup/dropoff locations for the shuttle.
 * Users need to find stops and see when shuttles will arrive.
 */

import { expect } from 'chai';
import sinon from 'sinon';
import express from 'express';
import request from 'supertest';

// Import the routes we're testing
import stopsRoutes from '../../src/routes/stops.routes.js';

// Import models to mock
import Stop from '../../src/lib/db/models/Stop.js';
import Arrival from '../../src/lib/db/models/Arrival.js';

// Import test helpers
import { mockStop, mockStops, mockArrival, mockIds } from '../helpers/testHelpers.js';

describe('Stops API Endpoints', function() {
  
  let app;
  
  beforeEach(function() {
    app = express();
    app.use(express.json());
    app.use('/api/stops', stopsRoutes);
    
    // Error handler
    app.use((err, req, res, next) => {
      res.status(err.statusCode || 500).json({
        success: false,
        message: err.message,
      });
    });
  });
  
  afterEach(function() {
    sinon.restore();
  });
  
  // ============================================================================
  // GET /api/stops - Get all stops
  // ============================================================================
  
  describe('GET /api/stops', function() {
    
    it('should return all stops sorted by name', async function() {
      // Setup: create a mock for the find chain
      const findStub = sinon.stub(Stop, 'find').returns({
        sort: sinon.stub().resolves(mockStops),
      });
      
      // Execute
      const response = await request(app)
        .get('/api/stops')
        .expect('Content-Type', /json/)
        .expect(200);
      
      // Assert
      expect(response.body.success).to.be.true;
      expect(response.body.count).to.equal(mockStops.length);
      expect(response.body.data).to.be.an('array');
    });
    
    it('should return stop with location coordinates', async function() {
      // Setup
      sinon.stub(Stop, 'find').returns({
        sort: sinon.stub().resolves([mockStop]),
      });
      
      // Execute
      const response = await request(app)
        .get('/api/stops')
        .expect(200);
      
      // Assert: stop should have location data
      const stop = response.body.data[0];
      expect(stop.name).to.equal('Walb Union');
      expect(stop.code).to.equal('WALB');
      expect(stop.location).to.exist;
      expect(stop.location.type).to.equal('Point');
      expect(stop.location.coordinates).to.be.an('array');
    });
    
    it('should return empty array when no stops exist', async function() {
      // Setup
      sinon.stub(Stop, 'find').returns({
        sort: sinon.stub().resolves([]),
      });
      
      // Execute
      const response = await request(app)
        .get('/api/stops')
        .expect(200);
      
      // Assert
      expect(response.body.success).to.be.true;
      expect(response.body.count).to.equal(0);
      expect(response.body.data).to.deep.equal([]);
    });
    
    it('should handle database errors', async function() {
      // Setup
      sinon.stub(Stop, 'find').returns({
        sort: sinon.stub().rejects(new Error('DB error')),
      });
      
      // Execute
      const response = await request(app)
        .get('/api/stops')
        .expect(500);
      
      // Assert
      expect(response.body.success).to.be.false;
    });
  });
  
  // ============================================================================
  // GET /api/stops?near=lat,lng - Get nearby stops
  // ============================================================================
  
  describe('GET /api/stops?near=lat,lng', function() {
    
    it('should return stops near given coordinates', async function() {
      // Setup: mock the geospatial query
      const findStub = sinon.stub(Stop, 'find').returns({
        limit: sinon.stub().resolves(mockStops),
      });
      
      // Execute: query for stops near Walb Union
      const response = await request(app)
        .get('/api/stops?near=41.117554,-85.108039')
        .expect(200);
      
      // Assert
      expect(response.body.success).to.be.true;
      expect(response.body.data).to.be.an('array');
      
      // Verify geospatial query was used
      expect(findStub.calledOnce).to.be.true;
      const queryArg = findStub.firstCall.args[0];
      expect(queryArg.location.$near).to.exist;
    });
    
    it('should reject invalid coordinate format', async function() {
      // Execute: invalid format
      const response = await request(app)
        .get('/api/stops?near=invalid')
        .expect(400);
      
      // Assert
      expect(response.body.success).to.be.false;
    });
    
    it('should limit results to 10 stops', async function() {
      // Setup
      const limitStub = sinon.stub().resolves(mockStops);
      sinon.stub(Stop, 'find').returns({
        limit: limitStub,
      });
      
      // Execute
      await request(app)
        .get('/api/stops?near=41.117554,-85.108039')
        .expect(200);
      
      // Assert: limit should be called with 10
      expect(limitStub.calledWith(10)).to.be.true;
    });
  });
  
  // ============================================================================
  // GET /api/stops/:id/arrivals - Get arrivals for a specific stop
  // ============================================================================
  
  describe('GET /api/stops/:id/arrivals', function() {
    
    it('should return arrivals for a stop', async function() {
      // Setup: mock the arrival query chain
      const mockArrivals = [
        {
          _id: mockIds.arrivalId,
          stopId: mockIds.stopId,
          shuttleId: { _id: mockIds.shuttleId, label: 'Bus 1', capacity: 45 },
          etaSeconds: 180,
          computedAt: new Date(),
        },
      ];
      
      sinon.stub(Arrival, 'find').returns({
        populate: sinon.stub().returns({
          sort: sinon.stub().returns({
            limit: sinon.stub().resolves(mockArrivals),
          }),
        }),
      });
      
      // Execute
      const response = await request(app)
        .get(`/api/stops/${mockIds.stopId}/arrivals`)
        .expect(200);
      
      // Assert
      expect(response.body.success).to.be.true;
      expect(response.body.data).to.be.an('array');
    });
    
    it('should only return recent arrivals (last 2 minutes)', async function() {
      // Setup
      const findStub = sinon.stub(Arrival, 'find').returns({
        populate: sinon.stub().returns({
          sort: sinon.stub().returns({
            limit: sinon.stub().resolves([]),
          }),
        }),
      });
      
      // Execute
      await request(app)
        .get(`/api/stops/${mockIds.stopId}/arrivals`)
        .expect(200);
      
      // Assert: verify the query filters by computedAt
      const queryArg = findStub.firstCall.args[0];
      expect(queryArg.computedAt.$gte).to.exist;
    });
    
    it('should limit to 3 arrivals', async function() {
      // Setup
      const limitStub = sinon.stub().resolves([]);
      sinon.stub(Arrival, 'find').returns({
        populate: sinon.stub().returns({
          sort: sinon.stub().returns({
            limit: limitStub,
          }),
        }),
      });
      
      // Execute
      await request(app)
        .get(`/api/stops/${mockIds.stopId}/arrivals`)
        .expect(200);
      
      // Assert
      expect(limitStub.calledWith(3)).to.be.true;
    });
    
    it('should return empty array when no arrivals', async function() {
      // Setup
      sinon.stub(Arrival, 'find').returns({
        populate: sinon.stub().returns({
          sort: sinon.stub().returns({
            limit: sinon.stub().resolves([]),
          }),
        }),
      });
      
      // Execute
      const response = await request(app)
        .get(`/api/stops/${mockIds.stopId}/arrivals`)
        .expect(200);
      
      // Assert
      expect(response.body.success).to.be.true;
      expect(response.body.count).to.equal(0);
    });
  });
});

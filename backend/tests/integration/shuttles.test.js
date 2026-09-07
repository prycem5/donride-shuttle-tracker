/**
 * tests/integration/shuttles.test.js
 * Integration tests for the Shuttles API endpoints
 * 
 * These tests verify:
 * - GET /api/shuttles/live returns active shuttles
 * - Query by route_id works
 * - Query by pickup/dropoff stops works
 * - Shuttle data includes location and status
 * 
 * The live shuttles endpoint is what powers the real-time map
 * showing where shuttles are currently located.
 */

import { expect } from 'chai';
import sinon from 'sinon';
import express from 'express';
import request from 'supertest';

// Import the routes we're testing
import shuttlesRoutes from '../../src/routes/shuttles.routes.js';

// Import models to mock
import Shuttle from '../../src/lib/db/models/Shuttle.js';
import Route from '../../src/lib/db/models/Route.js';
import Ping from '../../src/lib/db/models/Ping.js';

// Import test helpers
import {
  mockShuttle,
  mockShuttleInService,
  mockRoute,
  mockPing,
  mockIds,
} from '../helpers/testHelpers.js';

describe('Shuttles API Endpoints', function() {
  
  let app;
  
  beforeEach(function() {
    app = express();
    app.use(express.json());
    app.use('/api/shuttles', shuttlesRoutes);
    
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
  // GET /api/shuttles/live - Get all active shuttles
  // ============================================================================
  
  describe('GET /api/shuttles/live', function() {
    
    it('should return all in-service shuttles', async function() {
      // Setup: mock the query chain
      const mockShuttles = [mockShuttleInService];
      
      sinon.stub(Shuttle, 'find').returns({
        populate: sinon.stub().returnsThis(),
        lean: sinon.stub().resolves(mockShuttles),
      });
      
      // Mock ping lookup
      sinon.stub(Ping, 'findOne').returns({
        sort: sinon.stub().resolves(mockPing),
      });
      
      // Execute
      const response = await request(app)
        .get('/api/shuttles/live')
        .expect('Content-Type', /json/)
        .expect(200);
      
      // Assert
      expect(response.body.success).to.be.true;
      expect(response.body.data).to.be.an('array');
    });
    
    it('should only return shuttles with in_service status', async function() {
      // Setup
      const findStub = sinon.stub(Shuttle, 'find').returns({
        populate: sinon.stub().returnsThis(),
        lean: sinon.stub().resolves([]),
      });
      
      sinon.stub(Ping, 'findOne').returns({
        sort: sinon.stub().resolves(null),
      });
      
      // Execute
      await request(app)
        .get('/api/shuttles/live')
        .expect(200);
      
      // Assert: verify query filters by status
      expect(findStub.calledOnce).to.be.true;
      const queryArg = findStub.firstCall.args[0];
      expect(queryArg.status).to.equal('in_service');
    });
    
    it('should include ping data with location', async function() {
      // Setup
      const shuttleWithPing = { ...mockShuttleInService };
      
      sinon.stub(Shuttle, 'find').returns({
        populate: sinon.stub().returnsThis(),
        lean: sinon.stub().resolves([shuttleWithPing]),
      });
      
      sinon.stub(Ping, 'findOne').returns({
        sort: sinon.stub().resolves(mockPing),
      });
      
      // Execute
      const response = await request(app)
        .get('/api/shuttles/live')
        .expect(200);
      
      // Assert: response should include ping data
      const shuttle = response.body.data[0];
      expect(shuttle.ping).to.exist;
      expect(shuttle.ping.lat).to.be.a('number');
      expect(shuttle.ping.lng).to.be.a('number');
    });
    
    it('should return empty array when no shuttles are active', async function() {
      // Setup
      sinon.stub(Shuttle, 'find').returns({
        populate: sinon.stub().returnsThis(),
        lean: sinon.stub().resolves([]),
      });
      
      // Execute
      const response = await request(app)
        .get('/api/shuttles/live')
        .expect(200);
      
      // Assert
      expect(response.body.success).to.be.true;
      expect(response.body.count).to.equal(0);
      expect(response.body.data).to.deep.equal([]);
    });
  });
  
  // ============================================================================
  // GET /api/shuttles/live?route_id=xxx - Get shuttles by route
  // ============================================================================
  
  describe('GET /api/shuttles/live?route_id=xxx', function() {
    
    it('should return shuttles for specific route', async function() {
      // Setup
      const findStub = sinon.stub(Shuttle, 'find').returns({
        populate: sinon.stub().returnsThis(),
        lean: sinon.stub().resolves([mockShuttleInService]),
      });
      
      sinon.stub(Ping, 'findOne').returns({
        sort: sinon.stub().resolves(mockPing),
      });
      
      // Execute
      const response = await request(app)
        .get(`/api/shuttles/live?route_id=${mockIds.routeId}`)
        .expect(200);
      
      // Assert
      expect(response.body.success).to.be.true;
      
      // Verify query included route filter
      const queryArg = findStub.firstCall.args[0];
      expect(queryArg.routeId.toString()).to.equal(mockIds.routeId.toString());
    });
    
    it('should reject invalid route_id format', async function() {
      // Execute: use invalid ObjectId
      const response = await request(app)
        .get('/api/shuttles/live?route_id=invalid_id')
        .expect(400);
      
      // Assert
      expect(response.body.success).to.be.false;
    });
  });
  
  // ============================================================================
  // GET /api/shuttles/live?pickup_stop_id=xxx&dropoff_stop_id=yyy
  // Get shuttles that can take you from A to B
  // ============================================================================
  
  describe('GET /api/shuttles/live?pickup_stop_id&dropoff_stop_id', function() {
    
    it('should find shuttles serving both stops', async function() {
      // Setup: mock route query
      const routeWithStops = {
        ...mockRoute,
        stops: [
          { stopId: { _id: mockIds.stopId }, sequence: 0 },
          { stopId: { _id: 'stop2' }, sequence: 1 },
        ],
      };
      
      sinon.stub(Route, 'find').returns({
        populate: sinon.stub().resolves([routeWithStops]),
      });
      
      sinon.stub(Shuttle, 'find').returns({
        populate: sinon.stub().returnsThis(),
        lean: sinon.stub().resolves([mockShuttleInService]),
      });
      
      sinon.stub(Ping, 'findOne').returns({
        sort: sinon.stub().resolves(mockPing),
      });
      
      // Execute
      const response = await request(app)
        .get(`/api/shuttles/live?pickup_stop_id=${mockIds.stopId}&dropoff_stop_id=60d5ec49f1b2c72b8c8e4002`)
        .expect(200);
      
      // Assert
      expect(response.body.success).to.be.true;
    });
    
    it('should return empty when no routes serve both stops', async function() {
      // Setup: no routes found
      sinon.stub(Route, 'find').returns({
        populate: sinon.stub().resolves([]),
      });
      
      // Execute
      const response = await request(app)
        .get(`/api/shuttles/live?pickup_stop_id=${mockIds.stopId}&dropoff_stop_id=60d5ec49f1b2c72b8c8e4099`)
        .expect(200);
      
      // Assert
      expect(response.body.success).to.be.true;
      expect(response.body.count).to.equal(0);
    });
  });
  
  // ============================================================================
  // Error handling
  // ============================================================================
  
  describe('Error Handling', function() {
    
    it('should handle database errors gracefully', async function() {
      // Setup: simulate DB error
      sinon.stub(Shuttle, 'find').returns({
        populate: sinon.stub().returnsThis(),
        lean: sinon.stub().rejects(new Error('Connection lost')),
      });
      
      // Execute
      const response = await request(app)
        .get('/api/shuttles/live')
        .expect(500);
      
      // Assert
      expect(response.body.success).to.be.false;
    });
  });
});

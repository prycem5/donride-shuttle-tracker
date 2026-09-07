/**
 * tests/integration/routes.test.js
 * Integration tests for the Routes API endpoints
 * 
 * These tests verify:
 * - GET /api/routes returns all active routes
 * - Response format is correct
 * - Routes include shuttle information
 * 
 * For integration tests, we mock the database layer but test
 * the full request/response cycle through Express
 */

import { expect } from 'chai';
import sinon from 'sinon';
import express from 'express';
import request from 'supertest';

// Import the route we're testing
import routesRoutes from '../../src/routes/routes.routes.js';

// Import models to mock
import Route from '../../src/lib/db/models/Route.js';

// Import test helpers
import { mockRoute, mockShuttle, mockIds } from '../helpers/testHelpers.js';

describe('Routes API Endpoints', function() {
  
  let app;
  
  // Set up a mini Express app for testing
  beforeEach(function() {
    app = express();
    app.use(express.json());
    app.use('/api/routes', routesRoutes);
    
    // Add error handler
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
  // GET /api/routes - Get all active routes
  // ============================================================================
  
  describe('GET /api/routes', function() {
    
    it('should return all active routes', async function() {
      // Setup: mock Route.aggregate to return our test data
      const mockRoutes = [
        {
          _id: mockIds.routeId,
          name: 'Student Housing',
          shortName: 'Housing',
          longName: 'Student Housing Shuttle',
          color: '#3B82F6',
          shuttleId: mockIds.shuttleId,
          shuttleLabel: 'Student Housing',
          active: true,
        },
        {
          _id: mockIds.routeId,
          name: 'Canterbury Green',
          shortName: 'Canterbury',
          longName: 'Canterbury Green Shuttle',
          color: '#10B981',
          shuttleId: mockIds.shuttleId,
          shuttleLabel: 'Canterbury Green',
          active: true,
        },
      ];
      
      // Mock the aggregate function
      sinon.stub(Route, 'aggregate').resolves(mockRoutes);
      
      // Execute: make request to the endpoint
      const response = await request(app)
        .get('/api/routes')
        .expect('Content-Type', /json/)
        .expect(200);
      
      // Assert: check response structure
      expect(response.body.success).to.be.true;
      expect(response.body.count).to.equal(2);
      expect(response.body.data).to.be.an('array');
      expect(response.body.data).to.have.lengthOf(2);
    });
    
    it('should return empty array when no routes exist', async function() {
      // Setup: mock empty result
      sinon.stub(Route, 'aggregate').resolves([]);
      
      // Execute
      const response = await request(app)
        .get('/api/routes')
        .expect(200);
      
      // Assert
      expect(response.body.success).to.be.true;
      expect(response.body.count).to.equal(0);
      expect(response.body.data).to.be.an('array');
      expect(response.body.data).to.have.lengthOf(0);
    });
    
    it('should include route color and shuttle label', async function() {
      // Setup
      const mockRoutes = [
        {
          _id: mockIds.routeId,
          name: 'Student Housing',
          shortName: 'Housing',
          longName: 'Student Housing Shuttle',
          color: '#3B82F6',
          shuttleId: mockIds.shuttleId,
          shuttleLabel: 'Bus 1',
          active: true,
        },
      ];
      
      sinon.stub(Route, 'aggregate').resolves(mockRoutes);
      
      // Execute
      const response = await request(app)
        .get('/api/routes')
        .expect(200);
      
      // Assert: check that route has expected fields
      const route = response.body.data[0];
      expect(route.name).to.exist;
      expect(route.color).to.equal('#3B82F6');
      expect(route.shuttleLabel).to.equal('Bus 1');
    });
    
    it('should handle database errors gracefully', async function() {
      // Setup: mock database error
      sinon.stub(Route, 'aggregate').rejects(new Error('Database connection failed'));
      
      // Execute
      const response = await request(app)
        .get('/api/routes')
        .expect(500);
      
      // Assert
      expect(response.body.success).to.be.false;
    });
    
    it('should only return active routes', async function() {
      // The aggregate query should filter by active: true
      // This test verifies the query is constructed correctly
      
      const aggregateStub = sinon.stub(Route, 'aggregate').resolves([]);
      
      await request(app).get('/api/routes');
      
      // Check that aggregate was called with the right query
      expect(aggregateStub.calledOnce).to.be.true;
      const pipeline = aggregateStub.firstCall.args[0];
      
      // First stage should be $match with active: true
      expect(pipeline[0].$match.active).to.be.true;
    });
  });
});

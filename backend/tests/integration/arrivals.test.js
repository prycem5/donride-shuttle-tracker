/**
 * tests/integration/arrivals.test.js
 * Integration tests for the Arrivals API endpoints
 * 
 * These tests verify:
 * - GET /api/arrivals/stop/:stopId returns ETAs for a stop
 * - GET /api/arrivals/route/:routeId returns ETAs for all stops
 * - GET /api/arrivals/shuttle/:shuttleId returns upcoming stops
 * - POST /api/arrivals/calculate triggers ETA calculation
 * 
 * Arrivals are the predicted arrival times for shuttles at each stop.
 * This is what users see when they check "when is the next shuttle?"
 */

import { expect } from 'chai';
import sinon from 'sinon';
import express from 'express';
import request from 'supertest';

// Import the routes we're testing
import arrivalsRoutes from '../../src/routes/arrivals.routes.js';

// Import models to mock
import Arrival from '../../src/lib/db/models/Arrival.js';
import Stop from '../../src/lib/db/models/Stop.js';
import Route from '../../src/lib/db/models/Route.js';
import Shuttle from '../../src/lib/db/models/Shuttle.js';

// Import test helpers
import {
  mockArrival,
  mockStop,
  mockStops,
  mockRoute,
  mockShuttleInService,
  mockIds,
} from '../helpers/testHelpers.js';

describe('Arrivals API Endpoints', function() {
  
  let app;
  
  beforeEach(function() {
    app = express();
    app.use(express.json());
    app.use('/api/arrivals', arrivalsRoutes);
    
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
  // GET /api/arrivals/stop/:stopId - Get arrivals for a stop
  // ============================================================================
  
  describe('GET /api/arrivals/stop/:stopId', function() {
    
    it('should return arrivals for a valid stop', async function() {
      // Setup: mock stop exists
      sinon.stub(Stop, 'findById').resolves(mockStop);
      
      // Mock arrival data with populated shuttle info
      const mockArrivals = [
        {
          _id: mockIds.arrivalId,
          stopId: mockIds.stopId,
          shuttleId: {
            _id: mockIds.shuttleId,
            label: 'Bus 1',
            capacity: 45,
            status: 'in_service',
            currentStopId: mockIds.stopId,
            nextStopId: 'stop2',
            routeId: {
              _id: mockIds.routeId,
              name: 'Student Housing',
              color: '#3B82F6',
            },
          },
          etaSeconds: 180,
          confidence: 0.8,
          computedAt: new Date(),
        },
      ];
      
      // Mock the complex query chain
      sinon.stub(Arrival, 'find').returns({
        populate: sinon.stub().returns({
          populate: sinon.stub().returns({
            sort: sinon.stub().returns({
              limit: sinon.stub().resolves(mockArrivals),
            }),
          }),
        }),
      });
      
      // Execute
      const response = await request(app)
        .get(`/api/arrivals/stop/${mockIds.stopId}`)
        .expect('Content-Type', /json/)
        .expect(200);
      
      // Assert
      expect(response.body.success).to.be.true;
      expect(response.body.count).to.equal(1);
      expect(response.body.stop.name).to.equal('Walb Union');
      expect(response.body.data).to.be.an('array');
      
      // Check arrival format
      const arrival = response.body.data[0];
      expect(arrival.etaSeconds).to.equal(180);
      expect(arrival.etaMinutes).to.equal(3); // 180/60 rounded up
    });
    
    it('should return 404 for non-existent stop', async function() {
      // Setup: stop not found
      sinon.stub(Stop, 'findById').resolves(null);
      
      // Execute
      const response = await request(app)
        .get(`/api/arrivals/stop/${mockIds.stopId}`)
        .expect(404);
      
      // Assert
      expect(response.body.success).to.be.false;
      expect(response.body.message).to.include('not found');
    });
    
    it('should reject invalid stop ID format', async function() {
      // Execute: use invalid ObjectId
      const response = await request(app)
        .get('/api/arrivals/stop/invalid_id')
        .expect(400);
      
      // Assert
      expect(response.body.success).to.be.false;
    });
    
    it('should return empty array when no arrivals', async function() {
      // Setup
      sinon.stub(Stop, 'findById').resolves(mockStop);
      sinon.stub(Arrival, 'find').returns({
        populate: sinon.stub().returns({
          populate: sinon.stub().returns({
            sort: sinon.stub().returns({
              limit: sinon.stub().resolves([]),
            }),
          }),
        }),
      });
      
      // Execute
      const response = await request(app)
        .get(`/api/arrivals/stop/${mockIds.stopId}`)
        .expect(200);
      
      // Assert
      expect(response.body.success).to.be.true;
      expect(response.body.count).to.equal(0);
      expect(response.body.data).to.deep.equal([]);
    });
    
    it('should respect limit query parameter', async function() {
      // Setup
      sinon.stub(Stop, 'findById').resolves(mockStop);
      
      const limitStub = sinon.stub().resolves([]);
      sinon.stub(Arrival, 'find').returns({
        populate: sinon.stub().returns({
          populate: sinon.stub().returns({
            sort: sinon.stub().returns({
              limit: limitStub,
            }),
          }),
        }),
      });
      
      // Execute: request only 3 arrivals
      await request(app)
        .get(`/api/arrivals/stop/${mockIds.stopId}?limit=3`)
        .expect(200);
      
      // Assert: limit should be 3
      expect(limitStub.calledWith(3)).to.be.true;
    });
  });
  
  // ============================================================================
  // GET /api/arrivals/route/:routeId - Get arrivals for all stops on route
  // ============================================================================
  
  describe('GET /api/arrivals/route/:routeId', function() {
    
    it('should return arrivals grouped by stop', async function() {
      // Setup
      const routeWithStops = {
        ...mockRoute,
        stops: mockStops.map((s, i) => ({ 
          stopId: { _id: s._id, name: s.name, code: s.code } 
        })),
      };
      
      sinon.stub(Route, 'findById').returns({
        populate: sinon.stub().resolves(routeWithStops),
      });
      
      const mockArrivals = [
        {
          stopId: { _id: mockIds.stopId, name: 'Walb Union', code: 'WALB' },
          shuttleId: { _id: mockIds.shuttleId, label: 'Bus 1', capacity: 45 },
          etaSeconds: 120,
          confidence: 0.8,
          computedAt: new Date(),
        },
      ];
      
      sinon.stub(Arrival, 'find').returns({
        populate: sinon.stub().returns({
          populate: sinon.stub().returns({
            sort: sinon.stub().resolves(mockArrivals),
          }),
        }),
      });
      
      // Execute
      const response = await request(app)
        .get(`/api/arrivals/route/${mockIds.routeId}`)
        .expect(200);
      
      // Assert
      expect(response.body.success).to.be.true;
      expect(response.body.route.name).to.equal('Student Housing');
      expect(response.body.data).to.be.an('array');
    });
    
    it('should return 404 for non-existent route', async function() {
      // Setup
      sinon.stub(Route, 'findById').returns({
        populate: sinon.stub().resolves(null),
      });
      
      // Execute
      const response = await request(app)
        .get(`/api/arrivals/route/${mockIds.routeId}`)
        .expect(404);
      
      // Assert
      expect(response.body.success).to.be.false;
    });
    
    it('should reject invalid route ID', async function() {
      const response = await request(app)
        .get('/api/arrivals/route/invalid')
        .expect(400);
      
      expect(response.body.success).to.be.false;
    });
  });
  
  // ============================================================================
  // GET /api/arrivals/shuttle/:shuttleId - Get upcoming stops for shuttle
  // ============================================================================
  
  describe('GET /api/arrivals/shuttle/:shuttleId', function() {
    
    it('should return upcoming stops for shuttle', async function() {
      // Setup
      const mockArrivals = [
        {
          stopId: { _id: mockIds.stopId, name: 'Walb Union', code: 'WALB', location: mockStop.location },
          etaSeconds: 60,
          confidence: 0.9,
          computedAt: new Date(),
        },
        {
          stopId: { _id: 'stop2', name: 'Stop 2', code: 'STOP2', location: mockStop.location },
          etaSeconds: 180,
          confidence: 0.8,
          computedAt: new Date(),
        },
      ];
      
      sinon.stub(Arrival, 'find').returns({
        populate: sinon.stub().returns({
          sort: sinon.stub().resolves(mockArrivals),
        }),
      });
      
      // Execute
      const response = await request(app)
        .get(`/api/arrivals/shuttle/${mockIds.shuttleId}`)
        .expect(200);
      
      // Assert
      expect(response.body.success).to.be.true;
      expect(response.body.count).to.equal(2);
      expect(response.body.shuttleId).to.equal(mockIds.shuttleId.toString());
      
      // Check stops are sorted by ETA
      expect(response.body.data[0].etaSeconds).to.be.lessThan(response.body.data[1].etaSeconds);
    });
    
    it('should reject invalid shuttle ID', async function() {
      const response = await request(app)
        .get('/api/arrivals/shuttle/not_valid')
        .expect(400);
      
      expect(response.body.success).to.be.false;
    });
  });
  
  // ============================================================================
  // POST /api/arrivals/calculate - Manually trigger ETA calculation
  // ============================================================================
  
  describe('POST /api/arrivals/calculate', function() {
    
    it('should require shuttleId and routeId', async function() {
      // Execute: missing fields
      const response = await request(app)
        .post('/api/arrivals/calculate')
        .send({})
        .expect(400);
      
      expect(response.body.success).to.be.false;
    });
    
    it('should reject invalid IDs', async function() {
      const response = await request(app)
        .post('/api/arrivals/calculate')
        .send({
          shuttleId: 'invalid',
          routeId: 'also_invalid',
        })
        .expect(400);
      
      expect(response.body.success).to.be.false;
    });
    
    // Note: Full calculation test would require mocking the ETA service
    // which is complex. This is more of a smoke test.
  });
  
  // ============================================================================
  // Error handling
  // ============================================================================
  
  describe('Error Handling', function() {
    
    it('should handle database errors gracefully', async function() {
      // Setup: simulate DB error
      sinon.stub(Stop, 'findById').rejects(new Error('Connection lost'));
      
      // Execute
      const response = await request(app)
        .get(`/api/arrivals/stop/${mockIds.stopId}`)
        .expect(500);
      
      // Assert
      expect(response.body.success).to.be.false;
    });
  });
});

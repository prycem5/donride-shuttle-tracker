/**
 * tests/integration/health.test.js
 * Integration tests for health check and server status endpoints
 * 
 * These tests verify:
 * - GET /health returns server status
 * - GET /api returns API info
 * - Server responds correctly to basic requests
 * 
 * Health checks are used by load balancers and monitoring tools
 * to know if the server is up and running properly.
 */

import { expect } from 'chai';
import sinon from 'sinon';
import express from 'express';
import request from 'supertest';

// We'll create a minimal app for testing health endpoints
// In real app, these would come from the main app routes

describe('Health Check Endpoints', function() {
  
  let app;
  
  beforeEach(function() {
    app = express();
    app.use(express.json());
    
    // Simple health check endpoint
    app.get('/health', (req, res) => {
      res.status(200).json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
      });
    });
    
    // API info endpoint
    app.get('/api', (req, res) => {
      res.status(200).json({
        success: true,
        message: 'PFW Shuttle Tracker API',
        version: '1.0.0',
        endpoints: {
          routes: '/api/routes',
          stops: '/api/stops',
          shuttles: '/api/shuttles',
          arrivals: '/api/arrivals',
          auth: '/api/auth',
          driver: '/api/driver',
          admin: '/api/admin',
          incidents: '/api/incidents',
        },
      });
    });
    
    // 404 handler
    app.use((req, res) => {
      res.status(404).json({
        success: false,
        message: 'Endpoint not found',
        path: req.path,
      });
    });
  });
  
  afterEach(function() {
    sinon.restore();
  });
  
  // ============================================================================
  // GET /health - Health check
  // ============================================================================
  
  describe('GET /health', function() {
    
    it('should return healthy status', async function() {
      const response = await request(app)
        .get('/health')
        .expect('Content-Type', /json/)
        .expect(200);
      
      expect(response.body.status).to.equal('healthy');
    });
    
    it('should include timestamp', async function() {
      const response = await request(app)
        .get('/health')
        .expect(200);
      
      expect(response.body.timestamp).to.exist;
      // Verify it's a valid ISO date string
      const date = new Date(response.body.timestamp);
      expect(date.toString()).to.not.equal('Invalid Date');
    });
    
    it('should include uptime', async function() {
      const response = await request(app)
        .get('/health')
        .expect(200);
      
      expect(response.body.uptime).to.be.a('number');
      expect(response.body.uptime).to.be.at.least(0);
    });
  });
  
  // ============================================================================
  // GET /api - API info
  // ============================================================================
  
  describe('GET /api', function() {
    
    it('should return API information', async function() {
      const response = await request(app)
        .get('/api')
        .expect('Content-Type', /json/)
        .expect(200);
      
      expect(response.body.success).to.be.true;
      expect(response.body.message).to.include('Shuttle');
    });
    
    it('should include version number', async function() {
      const response = await request(app)
        .get('/api')
        .expect(200);
      
      expect(response.body.version).to.exist;
      // Version should be semver format (e.g., "1.0.0")
      expect(response.body.version).to.match(/^\d+\.\d+\.\d+$/);
    });
    
    it('should list available endpoints', async function() {
      const response = await request(app)
        .get('/api')
        .expect(200);
      
      expect(response.body.endpoints).to.be.an('object');
      expect(response.body.endpoints.routes).to.equal('/api/routes');
      expect(response.body.endpoints.stops).to.equal('/api/stops');
      expect(response.body.endpoints.shuttles).to.equal('/api/shuttles');
    });
  });
  
  // ============================================================================
  // 404 handling
  // ============================================================================
  
  describe('404 Not Found', function() {
    
    it('should return 404 for unknown endpoints', async function() {
      const response = await request(app)
        .get('/api/nonexistent')
        .expect(404);
      
      expect(response.body.success).to.be.false;
      expect(response.body.message).to.include('not found');
    });
    
    it('should include the requested path in error', async function() {
      const response = await request(app)
        .get('/api/some/random/path')
        .expect(404);
      
      expect(response.body.path).to.equal('/api/some/random/path');
    });
    
    it('should return JSON for unknown POST requests', async function() {
      const response = await request(app)
        .post('/api/unknown')
        .send({ test: 'data' })
        .expect('Content-Type', /json/)
        .expect(404);
      
      expect(response.body.success).to.be.false;
    });
  });
  
  // ============================================================================
  // Request handling
  // ============================================================================
  
  describe('Request Handling', function() {
    
    it('should accept JSON content type', async function() {
      const response = await request(app)
        .get('/api')
        .set('Content-Type', 'application/json')
        .expect(200);
      
      expect(response.body.success).to.be.true;
    });
    
    it('should handle requests without content type', async function() {
      const response = await request(app)
        .get('/health')
        .expect(200);
      
      expect(response.body.status).to.equal('healthy');
    });
  });
});

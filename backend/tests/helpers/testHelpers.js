/**
 * tests/helpers/testHelpers.js
 * Common test utilities and mock data
 * 
 * This file contains:
 * - Mock data that looks like real database objects
 * - Helper functions for creating test tokens
 * - Utility functions used across multiple tests
 * 
 * Having all mock data in one place makes it easy to:
 * - Keep tests consistent
 * - Update mock data if schemas change
 * - Reuse data across different test files
 */

import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';

// ============================================================================
// MOCK OBJECT IDs
// These look like real MongoDB ObjectIds but are predictable for testing
// ============================================================================

export const mockIds = {
  // User/Driver IDs
  userId: 'user_test123driver',
  driverId: new mongoose.Types.ObjectId('60d5ec49f1b2c72b8c8e4f99'),
  adminId: new mongoose.Types.ObjectId('60d5ec49f1b2c72b8c8e4f88'),
  
  // Route/Stop/Shuttle IDs (matching seed data)
  routeId: new mongoose.Types.ObjectId('60d5ec49f1b2c72b8c8e4f2a'),
  shuttleId: new mongoose.Types.ObjectId('60d5ec49f1b2c72b8c8e4f2b'),
  stopId: new mongoose.Types.ObjectId('60d5ec49f1b2c72b8c8e4001'),
  
  // Additional IDs for testing
  incidentId: new mongoose.Types.ObjectId('60d5ec49f1b2c72b8c8e4f77'),
  shiftId: new mongoose.Types.ObjectId('60d5ec49f1b2c72b8c8e4f66'),
  pingId: new mongoose.Types.ObjectId('60d5ec49f1b2c72b8c8e4f55'),
  arrivalId: new mongoose.Types.ObjectId('60d5ec49f1b2c72b8c8e4f44'),
};

// ============================================================================
// MOCK USER DATA
// ============================================================================

export const mockUser = {
  _id: mockIds.userId,
  email: 'testdriver@university.edu',
  name: 'Test Driver',
  roles: ['driver'],
  image: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

export const mockStudentUser = {
  _id: 'user_student123',
  email: 'student@university.edu',
  name: 'Test Student',
  roles: ['student'],
  image: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

export const mockAdminUser = {
  _id: mockIds.adminId,
  email: 'admin@university.edu',
  name: 'Test Admin',
  roles: ['admin'],
  isActive: true,
  createdAt: new Date(),
};

// ============================================================================
// MOCK DRIVER DATA
// ============================================================================

export const mockDriver = {
  _id: mockIds.driverId,
  userId: mockIds.userId,
  employeeId: 'EMP-TEST-001',
  assignedShuttleId: mockIds.shuttleId,
  currentRouteId: null,
  currentShuttleId: null,
  status: 'idle',
  shiftStartedAt: null,
  shiftEndedAt: null,
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date(),
};

export const mockDriverOnShift = {
  ...mockDriver,
  status: 'onroute',
  currentRouteId: mockIds.routeId,
  currentShuttleId: mockIds.shuttleId,
  shiftStartedAt: new Date(),
};

// ============================================================================
// MOCK SHUTTLE DATA
// ============================================================================

export const mockShuttle = {
  _id: mockIds.shuttleId,
  label: 'Student Housing',
  deviceId: 'DEVICE-001',
  capacity: 45,
  status: 'available',
  currentLocation: {
    type: 'Point',
    coordinates: [-85.108039, 41.117554], // Walb Union
  },
  currentDriverId: null,
  routeId: null,
  currentStopId: null,
  nextStopId: null,
  isAtStop: false,
  createdAt: new Date(),
  updatedAt: new Date(),
};

export const mockShuttleInService = {
  ...mockShuttle,
  status: 'in_service',
  currentDriverId: mockIds.driverId,
  routeId: mockIds.routeId,
  currentStopId: mockIds.stopId,
  isAtStop: true,
};

// ============================================================================
// MOCK STOP DATA
// ============================================================================

export const mockStop = {
  _id: mockIds.stopId,
  name: 'Walb Union',
  code: 'WALB',
  location: {
    type: 'Point',
    coordinates: [-85.108039, 41.117554],
  },
  routeIds: [mockIds.routeId],
  createdAt: new Date(),
  updatedAt: new Date(),
};

export const mockStops = [
  mockStop,
  {
    _id: new mongoose.Types.ObjectId('60d5ec49f1b2c72b8c8e4002'),
    name: 'Development Office',
    code: 'DEV-OFF',
    location: {
      type: 'Point',
      coordinates: [-85.1038529, 41.1150437],
    },
    routeIds: [mockIds.routeId],
  },
  {
    _id: new mongoose.Types.ObjectId('60d5ec49f1b2c72b8c8e4003'),
    name: 'Building H',
    code: 'BLDG-H',
    location: {
      type: 'Point',
      coordinates: [-85.100966, 41.115726],
    },
    routeIds: [mockIds.routeId],
  },
];

// ============================================================================
// MOCK ROUTE DATA
// ============================================================================

export const mockRoute = {
  _id: mockIds.routeId,
  name: 'Student Housing',
  shortName: 'Housing',
  longName: 'Student Housing Shuttle',
  color: '#3B82F6',
  shuttleId: mockIds.shuttleId,
  active: true,
  routeType: 'loop',
  stops: [
    {
      stopId: mockIds.stopId,
      sequence: 0,
      stopType: 'both',
      estimatedTimeFromPrevious: 0,
      distanceFromPrevious: 0,
    },
    {
      stopId: new mongoose.Types.ObjectId('60d5ec49f1b2c72b8c8e4002'),
      sequence: 1,
      stopType: 'both',
      estimatedTimeFromPrevious: 120,
      distanceFromPrevious: 450,
    },
  ],
  averageLoopTime: 900,
  createdAt: new Date(),
  updatedAt: new Date(),
};

// ============================================================================
// MOCK PING DATA
// ============================================================================

export const mockPing = {
  _id: mockIds.pingId,
  shuttleId: mockIds.shuttleId,
  driverId: mockIds.driverId,
  ts: new Date(),
  location: {
    type: 'Point',
    coordinates: [-85.108039, 41.117554],
  },
  speedKph: 25,
  heading: 180,
  accuracyM: 10,
  source: 'driver_app',
  createdAt: new Date(),
};

// ============================================================================
// MOCK ARRIVAL DATA
// ============================================================================

export const mockArrival = {
  _id: mockIds.arrivalId,
  stopId: mockIds.stopId,
  shuttleId: mockIds.shuttleId,
  etaSeconds: 180, // 3 minutes
  computedAt: new Date(),
  confidence: 0.8,
};

// ============================================================================
// MOCK INCIDENT DATA
// ============================================================================

export const mockIncident = {
  _id: mockIds.incidentId,
  reportedBy: {
    userId: mockIds.userId,
    type: 'driver',
    name: 'Test Driver',
  },
  type: 'vehicle_issue',
  priority: 'medium',
  status: 'reported',
  title: 'Flat tire on shuttle',
  description: 'The front left tire is flat.',
  relatedEntities: {
    shuttleId: mockIds.shuttleId,
    routeId: mockIds.routeId,
  },
  createdAt: new Date(),
  updatedAt: new Date(),
};

// ============================================================================
// MOCK SHIFT DATA
// ============================================================================

export const mockShift = {
  _id: mockIds.shiftId,
  driverId: mockIds.driverId,
  shuttleId: mockIds.shuttleId,
  routeId: mockIds.routeId,
  startTime: new Date(Date.now() - 3600000), // 1 hour ago
  endTime: null,
  status: 'active',
  duration: 60,
  metrics: {
    distance: 15.5,
    passengersServed: 25,
    stopsCompleted: 8,
    averageSpeed: 22,
    averageDelay: 2,
    totalPings: 120,
  },
  createdAt: new Date(),
};

// ============================================================================
// JWT TOKEN HELPERS
// These functions create valid tokens for testing authenticated routes
// ============================================================================

/**
 * Creates a valid driver JWT token for testing
 * @param {Object} overrides - Optional fields to override in the token payload
 * @returns {string} JWT token
 */
export function createDriverToken(overrides = {}) {
  const payload = {
    userId: mockIds.userId,
    driverId: mockIds.driverId.toString(),
    role: 'driver',
    ...overrides,
  };
  
  return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '1h' });
}

/**
 * Creates a valid student JWT token for testing
 * @param {Object} overrides - Optional fields to override
 * @returns {string} JWT token
 */
export function createStudentToken(overrides = {}) {
  const payload = {
    userId: 'user_student123',
    role: 'student',
    ...overrides,
  };
  
  return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '1h' });
}

/**
 * Creates a valid admin JWT token for testing
 * @param {Object} overrides - Optional fields to override
 * @returns {string} JWT token
 */
export function createAdminToken(overrides = {}) {
  const payload = {
    userId: mockIds.adminId.toString(),
    role: 'admin',
    ...overrides,
  };
  
  return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '1h' });
}

/**
 * Creates an expired JWT token for testing token expiration
 * @returns {string} Expired JWT token
 */
export function createExpiredToken() {
  const payload = {
    userId: mockIds.userId,
    driverId: mockIds.driverId.toString(),
    role: 'driver',
  };
  
  // Create token that expired 1 hour ago
  return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '-1h' });
}

// ============================================================================
// REQUEST/RESPONSE MOCK HELPERS
// These help create mock Express req/res objects for unit testing controllers
// ============================================================================

/**
 * Creates a mock Express request object
 * @param {Object} options - Request options (body, params, query, headers, user)
 * @returns {Object} Mock request object
 */
export function createMockRequest(options = {}) {
  return {
    body: options.body || {},
    params: options.params || {},
    query: options.query || {},
    headers: options.headers || {},
    user: options.user || null,
    ip: options.ip || '127.0.0.1',
    get: function(header) {
      return this.headers[header.toLowerCase()];
    },
  };
}

/**
 * Creates a mock Express response object with spy functions
 * @returns {Object} Mock response object with status, json, send methods
 */
export function createMockResponse() {
  const res = {
    statusCode: 200,
    jsonData: null,
    
    status: function(code) {
      this.statusCode = code;
      return this;
    },
    
    json: function(data) {
      this.jsonData = data;
      return this;
    },
    
    send: function(data) {
      this.jsonData = data;
      return this;
    },
  };
  
  return res;
}

/**
 * Creates a mock next function for middleware testing
 * @returns {Function} Mock next function that tracks if it was called
 */
export function createMockNext() {
  const next = function(error) {
    next.called = true;
    next.error = error || null;
  };
  next.called = false;
  next.error = null;
  return next;
}

// ============================================================================
// VALIDATION HELPERS
// ============================================================================

/**
 * Valid coordinates for Purdue Fort Wayne area
 * Use these when testing GPS-related endpoints
 */
export const validCoordinates = {
  lat: 41.117554,
  lng: -85.108039,
};

/**
 * Invalid coordinates for testing validation
 */
export const invalidCoordinates = {
  latTooHigh: 91.0,
  latTooLow: -91.0,
  lngTooHigh: 181.0,
  lngTooLow: -181.0,
};

// ============================================================================
// ASYNC HELPER
// Wraps async functions to catch errors in tests
// ============================================================================

export function asyncWrapper(fn) {
  return function(done) {
    fn().then(done).catch(done);
  };
}

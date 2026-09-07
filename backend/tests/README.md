# Shuttle Tracker Test Suite

This directory contains the complete test suite for the Shuttle Tracker API. Tests are written using **Mocha** as the test framework, **Chai** for assertions, **Sinon** for mocking/stubbing, and **Supertest** for HTTP integration testing.

## Table of Contents

- [Quick Start](#quick-start)
- [Test Structure](#test-structure)
- [Running Tests](#running-tests)
- [Test Categories](#test-categories)
- [Writing Tests](#writing-tests)
- [Mock Data & Helpers](#mock-data--helpers)
- [Best Practices](#best-practices)
- [Troubleshooting](#troubleshooting)

## Quick Start

```bash
# Run all tests
npm test

# Run only unit tests
npm run test:unit

# Run only integration tests
npm run test:integration

# Run tests in watch mode (re-runs on file changes)
npm run test:watch
```

## Test Structure

```
tests/
├── README.md                    # This file
├── setup.js                     # Global test setup (runs before all tests)
├── helpers/
│   └── testHelpers.js          # Mock data, token generators, utilities
├── integration/                 # API endpoint tests
│   ├── arrivals.test.js        # Arrivals API tests
│   ├── auth.test.js            # Authentication API tests
│   ├── driver.test.js          # Driver API tests
│   ├── health.test.js          # Health check endpoint tests
│   ├── routes.test.js          # Routes API tests
│   ├── shuttles.test.js        # Shuttles API tests
│   └── stops.test.js           # Stops API tests
└── unit/                        # Unit tests
    ├── middleware/
    │   ├── auth.test.js        # Auth middleware tests
    │   ├── error.test.js       # Error handling tests
    │   └── validation.test.js  # Validation helper tests
    ├── models/
    │   ├── driver.test.js      # Driver model tests
    │   └── shuttle.test.js     # Shuttle model tests
    └── services/
        └── eta.test.js         # ETA calculation service tests
```

## Running Tests

### All Tests
```bash
npm test
```
Runs all tests in `tests/**/*.test.js` with a 10-second timeout.

### Unit Tests Only
```bash
npm run test:unit
```
Runs tests in `tests/unit/**/*.test.js`.

### Integration Tests Only
```bash
npm run test:integration
```
Runs tests in `tests/integration/**/*.test.js`.

### Watch Mode
```bash
npm run test:watch
```
Automatically re-runs tests when files change. Great for development.

### Run Specific Test File
```bash
npx mocha --require tests/setup.js tests/integration/auth.test.js --timeout 10000
```

### Run Tests Matching Pattern
```bash
npx mocha --require tests/setup.js 'tests/**/*.test.js' --grep "should return"
```

## Test Categories

### Integration Tests (`tests/integration/`)

Integration tests verify that API endpoints work correctly end-to-end. They use **Supertest** to make HTTP requests to mock Express apps.

| File | Description | Endpoints Tested |
|------|-------------|------------------|
| `arrivals.test.js` | Arrival time predictions | `GET /api/arrivals/stop/:stopId`, `GET /api/arrivals/route/:routeId`, `GET /api/arrivals/shuttle/:shuttleId`, `POST /api/arrivals/calculate` |
| `auth.test.js` | Authentication flow | `POST /api/auth/driver-login` |
| `driver.test.js` | Driver operations | `POST /api/driver/ping`, `POST /api/driver/status`, `POST /api/driver/start-shift`, `POST /api/driver/end-shift` |
| `health.test.js` | Health checks | `GET /health`, `GET /api`, 404 handling |
| `routes.test.js` | Route retrieval | `GET /api/routes` |
| `shuttles.test.js` | Live shuttle data | `GET /api/shuttles/live` |
| `stops.test.js` | Stop information | `GET /api/stops`, `GET /api/stops/:id/arrivals` |

### Unit Tests (`tests/unit/`)

Unit tests verify individual functions and modules in isolation.

#### Middleware Tests (`tests/unit/middleware/`)

| File | Description |
|------|-------------|
| `auth.test.js` | JWT authentication, role-based access control (`authMiddleware`, `driverOnly`, `adminOnly`, `optionalAuth`) |
| `error.test.js` | Error handling, AppError class, error factory functions |
| `validation.test.js` | Input validation helpers (`isValidObjectId`, `validateCoordinates`, `sanitizeString`, etc.) |

#### Model Tests (`tests/unit/models/`)

| File | Description |
|------|-------------|
| `driver.test.js` | Driver schema validation, defaults, enums |
| `shuttle.test.js` | Shuttle schema validation, GeoJSON location handling |

#### Service Tests (`tests/unit/services/`)

| File | Description |
|------|-------------|
| `eta.test.js` | ETA calculation algorithms, distance calculations, confidence scoring |

## Writing Tests

### Basic Test Structure

```javascript
import { expect } from 'chai';
import sinon from 'sinon';

describe('Feature Name', function() {

  beforeEach(function() {
    // Setup before each test
  });

  afterEach(function() {
    // Cleanup after each test
    sinon.restore();
  });

  it('should do something specific', function() {
    // Arrange
    const input = 'test';

    // Act
    const result = someFunction(input);

    // Assert
    expect(result).to.equal('expected');
  });
});
```

### Integration Test Example

```javascript
import { expect } from 'chai';
import request from 'supertest';
import express from 'express';

describe('API Endpoint', function() {
  let app;

  beforeEach(function() {
    app = express();
    app.use(express.json());
    // Setup routes...
  });

  it('should return 200 for valid request', async function() {
    const response = await request(app)
      .get('/api/endpoint')
      .set('Authorization', 'Bearer valid-token')
      .expect(200);

    expect(response.body.success).to.be.true;
  });
});
```

### Using Mock Data

```javascript
import {
  mockIds,
  mockUser,
  mockShuttle,
  createDriverToken,
  validCoordinates,
} from '../helpers/testHelpers.js';

it('should use mock data', function() {
  const token = createDriverToken();
  const shuttleId = mockIds.shuttleId.toString();
  // Use in your tests...
});
```

## Mock Data & Helpers

The `tests/helpers/testHelpers.js` file provides:

### Mock IDs
```javascript
mockIds.userId      // Clerk user ID string
mockIds.driverId    // MongoDB ObjectId for driver
mockIds.shuttleId   // MongoDB ObjectId for shuttle
mockIds.routeId     // MongoDB ObjectId for route
mockIds.stopId      // MongoDB ObjectId for stop
```

### Mock Objects
```javascript
mockUser            // User object with driver role
mockStudentUser     // User object with student role
mockAdminUser       // User object with admin role
mockDriver          // Driver profile (idle)
mockDriverOnShift   // Driver profile (on shift)
mockShuttle         // Shuttle (available)
mockShuttleInService // Shuttle (in service)
mockStop            // Stop with location
mockRoute           // Route with stops
mockPing            // GPS ping data
mockIncident        // Incident report
```

### Token Generators
```javascript
createDriverToken(overrides)  // Creates JWT for driver
createStudentToken(overrides) // Creates JWT for student
createAdminToken(overrides)   // Creates JWT for admin
createExpiredToken()          // Creates expired JWT for testing
```

### Request/Response Mocks
```javascript
createMockRequest(options)    // Mock Express request
createMockResponse()          // Mock Express response
createMockNext()              // Mock next() function
```

### Validation Data
```javascript
validCoordinates    // { lat: 41.117554, lng: -85.108039 }
invalidCoordinates  // Various invalid coordinate values
```

## Best Practices

### 1. Always Restore Stubs
```javascript
afterEach(function() {
  sinon.restore();
});
```

### 2. Use Descriptive Test Names
```javascript
// Good
it('should return 401 when token is expired', ...)

// Bad
it('test auth', ...)
```

### 3. Follow AAA Pattern
```javascript
it('should calculate distance correctly', function() {
  // Arrange
  const point1 = { lat: 41.0, lng: -85.0 };
  const point2 = { lat: 41.1, lng: -85.1 };

  // Act
  const distance = calculateDistance(point1, point2);

  // Assert
  expect(distance).to.be.closeTo(14000, 500);
});
```

### 4. Test Edge Cases
- Empty inputs
- Invalid inputs
- Boundary values
- Error conditions

### 5. Isolate Tests
Each test should be independent and not rely on state from other tests.

### 6. Mock External Dependencies
Use Sinon to stub database calls, external APIs, etc.

```javascript
sinon.stub(Model, 'find').resolves([mockData]);
```

## Troubleshooting

### Common Issues

#### 1. "JWT_SECRET must be at least 32 characters"
The test setup automatically sets this. If you see this error, make sure `tests/setup.js` is being loaded:
```bash
npx mocha --require tests/setup.js ...
```

#### 2. "Cannot use import statement outside a module"
The project uses ES modules. Ensure `"type": "module"` is in `package.json`.

#### 3. Ably Authentication Error
Some tests create mock Express apps instead of importing actual routes to avoid Ably initialization. This is by design.

#### 4. Tests Timing Out
Increase the timeout:
```bash
npm test -- --timeout 30000
```

#### 5. Mongoose Duplicate Index Warnings
These warnings are cosmetic and don't affect tests. They indicate indexes are defined both in schema and via `schema.index()`.

### Debugging Tests

#### Run Single Test
```bash
npx mocha --require tests/setup.js tests/unit/middleware/auth.test.js --timeout 10000
```

#### Enable Console Output
In `tests/setup.js`, comment out:
```javascript
// console.log = () => {};
// console.warn = () => {};
```

#### Use .only() for Focused Testing
```javascript
describe.only('Focus on this suite', function() {
  it.only('Focus on this test', function() {
    // Only this test runs
  });
});
```

## Test Coverage

The test suite includes **216 tests** covering:

- **Integration Tests**: 67 tests
  - Arrivals API: 13 tests
  - Auth API: 8 tests
  - Driver API: 13 tests
  - Health Checks: 10 tests
  - Routes API: 5 tests
  - Shuttles API: 10 tests
  - Stops API: 8 tests

- **Unit Tests**: 149 tests
  - Auth Middleware: 17 tests
  - Error Middleware: 19 tests
  - Validation Middleware: 43 tests
  - Driver Model: 12 tests
  - Shuttle Model: 14 tests
  - ETA Service: 14 tests

## Environment Variables

Tests use the following environment variables (set in `tests/setup.js`):

| Variable | Value | Description |
|----------|-------|-------------|
| `NODE_ENV` | `test` | Enables test mode |
| `JWT_SECRET` | 32+ char string | JWT signing secret |
| `JWT_EXPIRE` | `1h` | Token expiration |
| `MONGODB_URI` | `mongodb://localhost:27017/shuttle-test` | Test database |

Additional variables can be set in `.env.test` file.

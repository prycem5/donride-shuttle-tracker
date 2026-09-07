# Shuttle Tracker API Documentation

## Base URL
```
http://localhost:5050
```

## Table of Contents
- [Authentication](#authentication)
- [Public Endpoints](#public-endpoints)
- [Driver Endpoints](#driver-endpoints)
- [Response Format](#response-format)
- [Error Codes](#error-codes)
- [Examples](#examples)

---

## Authentication

### Driver Login
Login with Clerk User ID to receive a JWT token for authenticated requests.

**Endpoint:** `POST /api/auth/driver-login`

**Request Body:**
```json
{
  "clerkUserId": "user_test123driver"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "driver": {
      "id": "64a8f9b2c1234567890abcde",
      "name": "Test Driver",
      "email": "testdriver@university.edu",
      "employeeId": "EMP-TEST-001",
      "shuttleId": "60d5ec49f1b2c72b8c8e4f2b",
      "shuttleLabel": "Bus-101",
      "currentRouteId": null,
      "currentShuttleId": null,
      "routeName": null,
      "status": "idle"
    }
  }
}
```

**Headers Required for Authenticated Endpoints:**
```
Authorization: Bearer YOUR_JWT_TOKEN
```

---

## Public Endpoints

### 1. Health Check
Check if the API is running.

**Endpoint:** `GET /health`

**Response:**
```json
{
  "success": true,
  "status": "healthy",
  "timestamp": "2025-01-22T12:00:00.000Z",
  "uptime": 123456.789,
  "memory": {
    "rss": 18464768,
    "heapTotal": 38797312,
    "heapUsed": 35793608,
    "external": 22238709,
    "arrayBuffers": 19456898
  }
}
```

### 2. Get All Active Routes
Retrieve all active shuttle routes.

**Endpoint:** `GET /api/routes`

**Response:**
```json
{
  "success": true,
  "count": 3,
  "data": [
    {
      "_id": "60d5ec49f1b2c72b8c8e4f2a",
      "name": "Student Housing",
      "shortName": "Housing",
      "longName": "Student Housing Shuttle",
      "color": "#3B82F6",
      "shuttleId": "60d5ec49f1b2c72b8c8e4f2b",
      "shuttleLabel": "Walb Union to Student Housing",
      "active": true
    },
    {
      "_id": "60d5ec49f1b2c72b8c8e4f3a",
      "name": "The Arch",
      "shortName": "Arch",
      "longName": "Shuttle to the Arch",
      "color": "#EF4444",
      "shuttleId": "60d5ec49f1b2c72b8c8e4f3b",
      "shuttleLabel": "Walb Union to The Arch",
      "active": true
    }
  ]
}
```

### 3. Get All Stops
Retrieve all shuttle stops or stops near a specific location.

**Endpoint:** `GET /api/stops`

**Query Parameters:**
- `near` (optional): Latitude and longitude separated by comma
  - Format: `lat,lng`
  - Example: `41.1181,-85.1093`
  - Returns stops within 5km, limited to 10 results

**Response (All Stops):**
```json
{
  "success": true,
  "count": 15,
  "data": [
    {
      "_id": "64a8f9b2c1234567890abcde",
      "name": "Walb Union",
      "code": "WALB-001",
      "location": {
        "type": "Point",
        "coordinates": [-85.1093, 41.1181]
      },
      "routeIds": [
        "60d5ec49f1b2c72b8c8e4f2a",
        "60d5ec49f1b2c72b8c8e4f3a"
      ],
      "sequence": 1
    }
  ]
}
```

**Response (Near Location):**
```json
{
  "success": true,
  "count": 3,
  "data": [
    {
      "_id": "64a8f9b2c1234567890abcde",
      "name": "Walb Union",
      "code": "WALB-001",
      "location": {
        "type": "Point",
        "coordinates": [-85.1093, 41.1181]
      },
      "routeIds": ["60d5ec49f1b2c72b8c8e4f2a"],
      "sequence": 1
    }
  ]
}
```

### 4. Get Stop Arrivals
Get estimated arrival times for shuttles at a specific stop.

**Endpoint:** `GET /api/stops/:id/arrivals`

**Parameters:**
- `id` (path): Stop ID

**Response:**
```json
{
  "success": true,
  "count": 2,
  "data": [
    {
      "_id": "64a8f9b2c1234567890abcde",
      "stopId": "64a8f9b2c1234567890abcde",
      "shuttleId": {
        "_id": "60d5ec49f1b2c72b8c8e4f2b",
        "label": "Bus-101",
        "capacity": 45
      },
      "etaSeconds": 180,
      "computedAt": "2025-01-22T12:00:00.000Z",
      "confidence": 0.8
    },
    {
      "_id": "64a8f9b2c1234567890abcdf",
      "stopId": "64a8f9b2c1234567890abcde",
      "shuttleId": {
        "_id": "60d5ec49f1b2c72b8c8e4f3b",
        "label": "Bus-102",
        "capacity": 40
      },
      "etaSeconds": 420,
      "computedAt": "2025-01-22T12:00:00.000Z",
      "confidence": 0.8
    }
  ]
}
```

### 5. Get Live Shuttles
Get currently active shuttles with their latest locations.

**Endpoint:** `GET /api/shuttles/live`

**Query Parameters:**
- `route_id` (optional): Filter by specific route ID

**Response:**
```json
{
  "success": true,
  "count": 2,
  "data": [
    {
      "_id": "60d5ec49f1b2c72b8c8e4f2b",
      "label": "Bus-101",
      "deviceId": "DEVICE-001",
      "routeId": {
        "_id": "60d5ec49f1b2c72b8c8e4f2a",
        "name": "Blue Route"
      },
      "capacity": 45,
      "status": "in_service",
      "currentDriverId": "64a8f9b2c1234567890abcde",
      "currentLocation": {
        "type": "Point",
        "coordinates": [-85.1093, 41.1181]
      },
      "heading": 90,
      "speedKph": 25.5,
      "lastPingAt": "2025-01-22T12:00:00.000Z",
      "ping": {
        "lat": 41.1181,
        "lng": -85.1093,
        "speed": 25.5,
        "heading": 90,
        "timestamp": "2025-01-22T12:00:00.000Z"
      }
    }
  ]
}
```

---

## Driver Endpoints

**Note:** All driver endpoints require authentication via JWT token in the `Authorization` header.

### 1. Start Shift
Start a driving shift on a specific route.

**Endpoint:** `POST /api/driver/start-shift`

**Headers:**
```
Authorization: Bearer YOUR_JWT_TOKEN
Content-Type: application/json
```

**Request Body:**
```json
{
  "routeId": "60d5ec49f1b2c72b8c8e4f2a"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "driverId": "64a8f9b2c1234567890abcde",
    "routeId": "60d5ec49f1b2c72b8c8e4f2a",
    "routeName": "Blue Route",
    "shuttleId": "60d5ec49f1b2c72b8c8e4f2b",
    "shuttleLabel": "Bus-101",
    "status": "onroute",
    "startedAt": "2025-01-22T12:00:00.000Z"
  }
}
```

**Error Responses:**
```json
{
  "success": false,
  "message": "Route not found or inactive"
}
```

```json
{
  "success": false,
  "message": "Shuttle is not available. It may be in use by another driver."
}
```

```json
{
  "success": false,
  "message": "You are already on a shift. Please end your current shift first."
}
```

### 2. End Shift
End the current driving shift.

**Endpoint:** `POST /api/driver/end-shift`

**Headers:**
```
Authorization: Bearer YOUR_JWT_TOKEN
Content-Type: application/json
```

**Response:**
```json
{
  "success": true,
  "message": "Shift ended successfully",
  "data": {
    "driverId": "64a8f9b2c1234567890abcde",
    "shiftDuration": 7200,
    "endedAt": "2025-01-22T14:00:00.000Z"
  }
}
```

### 3. Send GPS Ping
Send the shuttle's current GPS location (should be sent every 5-10 seconds while driving).

**Endpoint:** `POST /api/driver/ping`

**Headers:**
```
Authorization: Bearer YOUR_JWT_TOKEN
Content-Type: application/json
```

**Request Body:**
```json
{
  "shuttleId": "60d5ec49f1b2c72b8c8e4f2b",
  "lat": 41.1181,
  "lng": -85.1093,
  "speed": 25.5,
  "heading": 90,
  "accuracy": 10,
  "timestamp": "2025-01-22T12:00:00.000Z"
}
```

**Field Descriptions:**
- `shuttleId` (required): ID of the shuttle
- `lat` (required): Latitude (-90 to 90)
- `lng` (required): Longitude (-180 to 180)
- `speed` (required): Speed in km/h (minimum 0)
- `heading` (optional): Compass heading in degrees (0-359)
- `accuracy` (optional): GPS accuracy in meters
- `timestamp` (optional): ISO 8601 timestamp (defaults to server time)

**Response:**
```json
{
  "success": true,
  "data": {
    "pingId": "64a8f9b2c1234567890abcde",
    "timestamp": "2025-01-22T12:00:00.000Z"
  }
}
```

### 4. Update Status
Update the driver's status.

**Endpoint:** `POST /api/driver/status`

**Headers:**
```
Authorization: Bearer YOUR_JWT_TOKEN
Content-Type: application/json
```

**Request Body:**
```json
{
  "status": "break"
}
```

**Valid Status Values:**
- `idle`: Not actively driving
- `onroute`: Currently driving a route
- `break`: On break

**Response:**
```json
{
  "success": true,
  "message": "Status updated successfully"
}
```

---

## Push Notifications

### Subscribe to Push Notifications

**Endpoint:** `POST /api/push/subscribe`

**Request Body:**
```json
{
  "userId": "user_123456",
  "subscription": {
    "endpoint": "https://fcm.googleapis.com/fcm/send/...",
    "keys": {
      "p256dh": "BNcRdreALRFXTkOO...",
      "auth": "tBHItJI5svbpez7K..."
    }
  }
}
```

**Response:**
```json
{
  "success": true,
  "message": "Subscription saved successfully"
}
```

### Unsubscribe from Push Notifications

**Endpoint:** `POST /api/push/unsubscribe`

**Request Body:**
```json
{
  "endpoint": "https://fcm.googleapis.com/fcm/send/..."
}
```

**Response:**
```json
{
  "success": true,
  "message": "Unsubscribed successfully"
}
```

---

## Response Format

### Success Response
All successful responses follow this format:
```json
{
  "success": true,
  "data": { /* response data */ },
  "count": 0  /* optional: for list responses */
}
```

### Error Response
All error responses follow this format:
```json
{
  "success": false,
  "message": "Error message describing what went wrong",
  "errors": [  /* optional: for validation errors */
    {
      "field": "fieldName",
      "message": "Validation error message",
      "value": "invalid value"
    }
  ]
}
```

---

## Error Codes

| Status Code | Description |
|------------|-------------|
| 200 | Success |
| 201 | Created (e.g., ping created) |
| 400 | Bad Request (validation error) |
| 401 | Unauthorized (invalid or missing token) |
| 403 | Forbidden (insufficient permissions) |
| 404 | Not Found (resource doesn't exist) |
| 429 | Too Many Requests (rate limit exceeded) |
| 500 | Internal Server Error |

### Common Error Messages

**Authentication Errors:**
- `"No token provided. Please include Authorization header with Bearer token."`
- `"Token has expired. Please login again."`
- `"Invalid token. Please login again."`
- `"Access denied. Driver role required."`

**Validation Errors:**
- `"Validation failed"` (includes array of specific field errors)
- `"Invalid latitude"` (lat must be -90 to 90)
- `"Invalid longitude"` (lng must be -180 to 180)
- `"Invalid speed"` (speed must be >= 0)

---

## Examples

### Complete Driver Workflow

#### 1. Driver Login
```bash
curl -X POST http://localhost:5050/api/auth/driver-login \
  -H "Content-Type: application/json" \
  -d '{
    "clerkUserId": "user_test123driver"
  }'
```

Save the token from the response.

#### 2. Get Available Routes
```bash
curl http://localhost:5050/api/routes
```

Choose a route ID from the response.

#### 3. Start Shift
```bash
curl -X POST http://localhost:5050/api/driver/start-shift \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -d '{
    "routeId": "60d5ec49f1b2c72b8c8e4f2a"
  }'
```

#### 4. Send GPS Pings (every 5-10 seconds while driving)
```bash
curl -X POST http://localhost:5050/api/driver/ping \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -d '{
    "shuttleId": "60d5ec49f1b2c72b8c8e4f2b",
    "lat": 41.1181,
    "lng": -85.1093,
    "speed": 25.5,
    "heading": 90,
    "accuracy": 10
  }'
```

#### 5. Take a Break
```bash
curl -X POST http://localhost:5050/api/driver/status \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -d '{
    "status": "break"
  }'
```

#### 6. Resume Driving
```bash
curl -X POST http://localhost:5050/api/driver/status \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -d '{
    "status": "onroute"
  }'
```

#### 7. End Shift
```bash
curl -X POST http://localhost:5050/api/driver/end-shift \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

### Student/Public User Workflow

#### 1. Get All Routes
```bash
curl http://localhost:5050/api/routes
```

#### 2. Get All Stops
```bash
curl http://localhost:5050/api/stops
```

#### 3. Get Stops Near Current Location
```bash
curl "http://localhost:5050/api/stops?near=41.1181,-85.1093"
```

#### 4. Get Arrival Times for a Stop
```bash
curl http://localhost:5050/api/stops/64a8f9b2c1234567890abcde/arrivals
```

#### 5. Get Live Shuttle Locations
```bash
curl http://localhost:5050/api/shuttles/live
```

#### 6. Get Live Shuttles for Specific Route
```bash
curl "http://localhost:5050/api/shuttles/live?route_id=60d5ec49f1b2c72b8c8e4f2a"
```

---

## Rate Limits

- **General API Endpoints:** 100 requests per 15 minutes per IP
- **Driver Ping Endpoint:** 100 requests per minute per IP

When rate limit is exceeded:
```json
{
  "success": false,
  "message": "Too many requests from this IP, please try again later."
}
```

---

## Real-time Updates

The API broadcasts real-time updates via Ably channels:

### Channels

- **Shuttle Updates:** `shuttle:{shuttleId}`
  - Event: `ping`
  - Published when driver sends GPS location

- **Stop Updates:** `stop:{stopId}`
  - Event: `arrival`
  - Published when ETA is calculated for a stop

- **Global Updates:** `global`
  - Various system-wide events

### Example Ping Event Data
```json
{
  "shuttleId": "60d5ec49f1b2c72b8c8e4f2b",
  "lat": 41.1181,
  "lng": -85.1093,
  "speed": 25.5,
  "heading": 90,
  "timestamp": "2025-01-22T12:00:00.000Z",
  "driverId": "64a8f9b2c1234567890abcde"
}
```

---

## Data Models

### Route
```json
{
  "_id": "ObjectId",
  "name": "String",
  "shortName": "String",
  "longName": "String",
  "color": "String (hex color)",
  "shuttleId": "ObjectId (ref: Shuttle)",
  "active": "Boolean",
  "createdAt": "Date",
  "updatedAt": "Date"
}
```

### Stop
```json
{
  "_id": "ObjectId",
  "name": "String",
  "code": "String (unique)",
  "location": {
    "type": "Point",
    "coordinates": "[lng, lat]"
  },
  "routeIds": ["ObjectId (ref: Route)"],
  "sequence": "Number",
  "createdAt": "Date",
  "updatedAt": "Date"
}
```

### Shuttle
```json
{
  "_id": "ObjectId",
  "label": "String",
  "deviceId": "String",
  "routeId": "ObjectId (ref: Route)",
  "capacity": "Number",
  "status": "String (available|in_service|out_of_service|maintenance)",
  "currentDriverId": "ObjectId (ref: Driver)",
  "currentLocation": {
    "type": "Point",
    "coordinates": "[lng, lat]"
  },
  "heading": "Number (0-359)",
  "speedKph": "Number",
  "lastPingAt": "Date",
  "createdAt": "Date",
  "updatedAt": "Date"
}
```

### Ping
```json
{
  "_id": "ObjectId",
  "shuttleId": "ObjectId (ref: Shuttle)",
  "driverId": "ObjectId (ref: Driver)",
  "ts": "Date",
  "location": {
    "type": "Point",
    "coordinates": "[lng, lat]"
  },
  "speedKph": "Number",
  "heading": "Number (0-359)",
  "accuracyM": "Number",
  "source": "String (driver_app|device_gateway|mock)",
  "batteryPct": "Number (0-100)",
  "createdAt": "Date"
}
```

### Arrival
```json
{
  "_id": "ObjectId",
  "stopId": "ObjectId (ref: Stop)",
  "shuttleId": "ObjectId (ref: Shuttle)",
  "etaSeconds": "Number",
  "computedAt": "Date",
  "confidence": "Number (0-1)"
}
```

---

## Support

For issues or questions:
- Check the [GitHub repository](https://github.com/your-repo/shuttle-tracker)
- Contact: support@university.edu
- API Version: 1.0.0
- Last Updated: January 22, 2025

import { validationResult } from 'express-validator';
import mongoose from 'mongoose';

// ============================================================================
// PRODUCTION-READY VALIDATION MIDDLEWARE
// ============================================================================

/**
 * Main validation middleware
 * Processes express-validator results and formats error responses
 */
export const validate = (req, res, next) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    // Log validation failures for security monitoring
    console.warn(`⚠️ Validation failed on ${req.method} ${req.path}:`, {
      ip: req.ip,
      errors: errors.array().map(e => e.path),
    });

    return res.status(400).json({
      success: false,
      message: 'Validation failed. Please check your input.',
      code: 'VALIDATION_ERROR',
      errors: errors.array().map(err => ({
        field: err.path || err.param,
        message: err.msg,
        // Don't expose actual values in production for security
        ...(process.env.NODE_ENV === 'development' && { value: err.value }),
      })),
    });
  }

  next();
};

/**
 * Validate MongoDB ObjectId
 * Prevents CastError and potential injection
 */
export const isValidObjectId = (value) => {
  if (!value) return false;

  // Check if it's a valid ObjectId string format
  if (typeof value !== 'string') return false;

  // Must be 24 hex characters
  if (!/^[0-9a-fA-F]{24}$/.test(value)) return false;

  // Verify with mongoose
  return mongoose.Types.ObjectId.isValid(value);
};

/**
 * Validate coordinates
 * Strict validation to prevent invalid GPS data
 */
export const validateCoordinates = (lat, lng) => {
  const latitude = parseFloat(lat);
  const longitude = parseFloat(lng);

  // Check for NaN
  if (isNaN(latitude) || isNaN(longitude)) {
    return { valid: false, error: 'Coordinates must be numbers' };
  }

  // Check latitude range
  if (latitude < -90 || latitude > 90) {
    return { valid: false, error: 'Latitude must be between -90 and 90' };
  }

  // Check longitude range
  if (longitude < -180 || longitude > 180) {
    return { valid: false, error: 'Longitude must be between -180 and 180' };
  }

  // Additional check: reject obviously wrong coordinates (0,0 is in ocean)
  if (latitude === 0 && longitude === 0) {
    return { valid: false, error: 'Invalid coordinate origin (0,0)' };
  }

  // Check for Purdue Fort Wayne area (basic sanity check)
  // Purdue Fort Wayne is around 41.12°N, 85.10°W
  // Allow reasonable range for campus shuttles (±0.5 degrees)
  const PFW_LAT = 41.12;
  const PFW_LNG = -85.10;
  const MAX_DISTANCE = 0.5;

  if (
    Math.abs(latitude - PFW_LAT) > MAX_DISTANCE ||
    Math.abs(longitude - PFW_LNG) > MAX_DISTANCE
  ) {
    console.warn(`⚠️ Coordinates outside expected range: ${latitude}, ${longitude}`);
    // Don't fail, but log for monitoring - could be legitimate edge cases
  }

  return { valid: true, latitude, longitude };
};

/**
 * Validate timestamp freshness
 * Prevents replay attacks with old GPS data
 */
export const validateTimestamp = (timestamp, maxAgeMinutes = 5) => {
  if (!timestamp) {
    return { valid: false, error: 'Timestamp required' };
  }

  const ts = new Date(timestamp);

  // Check if valid date
  if (isNaN(ts.getTime())) {
    return { valid: false, error: 'Invalid timestamp format' };
  }

  const now = Date.now();
  const tsTime = ts.getTime();
  const maxAge = maxAgeMinutes * 60 * 1000;

  // Check if timestamp is in the future (clock skew tolerance: 1 minute)
  if (tsTime > now + 60000) {
    return { valid: false, error: 'Timestamp cannot be in the future' };
  }

  // Check if timestamp is too old
  if (tsTime < now - maxAge) {
    return { valid: false, error: `Timestamp too old (max ${maxAgeMinutes} minutes)` };
  }

  return { valid: true, timestamp: ts };
};

/**
 * Validate speed (for GPS pings)
 * Prevent unrealistic speed values
 */
export const validateSpeed = (speed) => {
  const speedKph = parseFloat(speed);

  if (isNaN(speedKph)) {
    return { valid: false, error: 'Speed must be a number' };
  }

  if (speedKph < 0) {
    return { valid: false, error: 'Speed cannot be negative' };
  }

  // Shuttle max speed ~80 km/h (reasonable for campus shuttle)
  if (speedKph > 80) {
    console.warn(`⚠️ Unusually high speed reported: ${speedKph} km/h`);
    return { valid: false, error: 'Speed exceeds maximum (80 km/h)' };
  }

  return { valid: true, speed: speedKph };
};

/**
 * Validate heading/bearing
 */
export const validateHeading = (heading) => {
  if (heading === null || heading === undefined) {
    return { valid: true, heading: null }; // Optional field
  }

  const h = parseFloat(heading);

  if (isNaN(h)) {
    return { valid: false, error: 'Heading must be a number' };
  }

  if (h < 0 || h > 359) {
    return { valid: false, error: 'Heading must be between 0 and 359' };
  }

  return { valid: true, heading: h };
};

/**
 * Validate accuracy (GPS)
 */
export const validateAccuracy = (accuracy) => {
  if (accuracy === null || accuracy === undefined) {
    return { valid: true, accuracy: null }; // Optional field
  }

  const acc = parseFloat(accuracy);

  if (isNaN(acc)) {
    return { valid: false, error: 'Accuracy must be a number' };
  }

  if (acc < 0) {
    return { valid: false, error: 'Accuracy cannot be negative' };
  }

  // GPS accuracy shouldn't exceed 1000m for valid tracking
  if (acc > 1000) {
    console.warn(`⚠️ Poor GPS accuracy: ${acc}m`);
    return { valid: false, error: 'GPS accuracy too low (>1000m)' };
  }

  return { valid: true, accuracy: acc };
};

/**
 * Sanitize string input
 * Remove potentially dangerous characters
 */
export const sanitizeString = (str, maxLength = 255) => {
  if (!str || typeof str !== 'string') return '';

  return str
    .trim()
    .substring(0, maxLength)
    .replace(/[<>]/g, '') // Remove < and > to prevent XSS
    .replace(/[\x00-\x1F\x7F]/g, ''); // Remove control characters
};

/**
 * Validate email format
 */
export const isValidEmail = (email) => {
  if (!email || typeof email !== 'string') return false;

  // Basic email regex (good enough for validation)
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  return emailRegex.test(email) && email.length <= 254;
};

/**
 * Validate pagination parameters
 */
export const validatePagination = (limit, offset) => {
  const l = parseInt(limit) || 10;
  const o = parseInt(offset) || 0;

  // Enforce max limit to prevent DoS
  const maxLimit = 100;
  const safeLimit = Math.min(Math.max(l, 1), maxLimit);
  const safeOffset = Math.max(o, 0);

  return { limit: safeLimit, offset: safeOffset };
};

/**
 * Validate and sanitize MongoDB query
 * Prevent NoSQL injection in queries
 */
export const sanitizeMongoQuery = (query) => {
  if (!query || typeof query !== 'object') return {};

  // Remove keys starting with $ (MongoDB operators)
  const sanitized = {};
  for (const [key, value] of Object.entries(query)) {
    // Skip MongoDB operators
    if (key.startsWith('$')) {
      console.warn(`⚠️ Blocked MongoDB operator in query: ${key}`);
      continue;
    }

    // Recursively sanitize nested objects
    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      sanitized[key] = sanitizeMongoQuery(value);
    } else {
      sanitized[key] = value;
    }
  }

  return sanitized;
};

/**
 * Middleware to validate GPS ping data
 * Complete validation for driver ping submissions
 */
export const validatePingData = (req, res, next) => {
  const { shuttleId, lat, lng, speed, heading, accuracy, timestamp } = req.body;

  // Validate shuttleId (ObjectId)
  if (!shuttleId || !isValidObjectId(shuttleId)) {
    return res.status(400).json({
      success: false,
      message: 'Valid shuttle ID is required.',
      code: 'INVALID_SHUTTLE_ID',
    });
  }

  // Validate coordinates
  const coordValidation = validateCoordinates(lat, lng);
  if (!coordValidation.valid) {
    return res.status(400).json({
      success: false,
      message: coordValidation.error,
      code: 'INVALID_COORDINATES',
    });
  }

  // Validate speed
  const speedValidation = validateSpeed(speed);
  if (!speedValidation.valid) {
    return res.status(400).json({
      success: false,
      message: speedValidation.error,
      code: 'INVALID_SPEED',
    });
  }

  // Validate heading (optional)
  if (heading !== null && heading !== undefined) {
    const headingValidation = validateHeading(heading);
    if (!headingValidation.valid) {
      return res.status(400).json({
        success: false,
        message: headingValidation.error,
        code: 'INVALID_HEADING',
      });
    }
  }

  // Validate accuracy (optional)
  if (accuracy !== null && accuracy !== undefined) {
    const accValidation = validateAccuracy(accuracy);
    if (!accValidation.valid) {
      return res.status(400).json({
        success: false,
        message: accValidation.error,
        code: 'INVALID_ACCURACY',
      });
    }
  }

  // Validate timestamp (optional, but recommended)
  if (timestamp) {
    const tsValidation = validateTimestamp(timestamp);
    if (!tsValidation.valid) {
      return res.status(400).json({
        success: false,
        message: tsValidation.error,
        code: 'INVALID_TIMESTAMP',
      });
    }
  }

  // All validations passed
  next();
};

/**
 * Middleware to validate ObjectId parameters
 * Use this for routes with :id parameters
 */
export const validateObjectIdParam = (paramName = 'id') => {
  return (req, res, next) => {
    const id = req.params[paramName];

    if (!id || !isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: `Invalid ${paramName}. Must be a valid ObjectId.`,
        code: 'INVALID_OBJECT_ID',
      });
    }

    next();
  };
};

/**
 * Comprehensive input validator middleware
 * Use this for complex validation scenarios
 */
export const validateInput = (schema) => {
  return (req, res, next) => {
    const errors = [];

    // Validate based on schema
    for (const [field, rules] of Object.entries(schema)) {
      const value = req.body[field] || req.params[field] || req.query[field];

      // Required check
      if (rules.required && !value) {
        errors.push({ field, message: `${field} is required` });
        continue;
      }

      // Skip further validation if not required and not provided
      if (!value) continue;

      // Type validation
      if (rules.type === 'objectId' && !isValidObjectId(value)) {
        errors.push({ field, message: `${field} must be a valid ID` });
      }

      if (rules.type === 'email' && !isValidEmail(value)) {
        errors.push({ field, message: `${field} must be a valid email` });
      }

      if (rules.type === 'number') {
        const num = parseFloat(value);
        if (isNaN(num)) {
          errors.push({ field, message: `${field} must be a number` });
        } else if (rules.min !== undefined && num < rules.min) {
          errors.push({ field, message: `${field} must be at least ${rules.min}` });
        } else if (rules.max !== undefined && num > rules.max) {
          errors.push({ field, message: `${field} must be at most ${rules.max}` });
        }
      }

      // String length validation
      if (rules.type === 'string' && typeof value === 'string') {
        if (rules.minLength && value.length < rules.minLength) {
          errors.push({ field, message: `${field} must be at least ${rules.minLength} characters` });
        }
        if (rules.maxLength && value.length > rules.maxLength) {
          errors.push({ field, message: `${field} must be at most ${rules.maxLength} characters` });
        }
      }

      // Enum validation
      if (rules.enum && !rules.enum.includes(value)) {
        errors.push({ field, message: `${field} must be one of: ${rules.enum.join(', ')}` });
      }

      // Custom validator
      if (rules.validator && !rules.validator(value)) {
        errors.push({ field, message: rules.message || `${field} is invalid` });
      }
    }

    if (errors.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        code: 'VALIDATION_ERROR',
        errors,
      });
    }

    next();
  };
};

export default {
  validate,
  isValidObjectId,
  validateCoordinates,
  validateTimestamp,
  validateSpeed,
  validateHeading,
  validateAccuracy,
  sanitizeString,
  isValidEmail,
  validatePagination,
  sanitizeMongoQuery,
  validateInput,
  validatePingData,
  validateObjectIdParam,
};
// ============================================================================
// PRODUCTION-READY ERROR HANDLING MIDDLEWARE
// ============================================================================

const IS_PRODUCTION = process.env.NODE_ENV === 'production';

/**
 * Main error handler middleware
 * Handles all errors with security in mind
 */
export const errorHandler = (err, req, res, next) => {
  // Log error details (server-side only, never to client)
  console.error('====================================');
  console.error('❌ Error occurred:');
  console.error('Request ID:', req.id || 'N/A');
  console.error('Path:', req.path);
  console.error('Method:', req.method);
  console.error('IP:', req.ip);
  console.error('User:', req.user?.userId || 'Unauthenticated');
  console.error('Error Name:', err.name);
  console.error('Error Message:', err.message);
  
  // Only log stack trace in development
  if (!IS_PRODUCTION) {
    console.error('Stack:', err.stack);
  }
  console.error('====================================');

  // Send to error tracking service (Sentry, etc.) in production
  if (IS_PRODUCTION && global.Sentry) {
    global.Sentry.captureException(err, {
      user: req.user ? { id: req.user.userId, role: req.user.role } : undefined,
      extra: {
        path: req.path,
        method: req.method,
        ip: req.ip,
      },
    });
  }

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    const errors = Object.values(err.errors).map(e => ({
      field: e.path,
      message: e.message,
    }));

    return res.status(400).json({
      success: false,
      message: 'Validation error. Please check your input.',
      code: 'VALIDATION_ERROR',
      errors,
    });
  }

  // Mongoose duplicate key error
  if (err.code === 11000) {
    const field = Object.keys(err.keyPattern || {})[0] || 'field';
    return res.status(400).json({
      success: false,
      message: 'Duplicate value detected. This resource already exists.',
      code: 'DUPLICATE_ERROR',
      field,
    });
  }

  // Mongoose cast error (invalid ObjectId)
  if (err.name === 'CastError') {
    return res.status(400).json({
      success: false,
      message: 'Invalid ID format.',
      code: 'INVALID_ID',
      // Don't expose the actual value or path in production
      ...(process.env.NODE_ENV === 'development' && {
        field: err.path,
      }),
    });
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      success: false,
      message: 'Invalid authentication token.',
      code: 'INVALID_TOKEN',
    });
  }

  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({
      success: false,
      message: 'Authentication token has expired. Please login again.',
      code: 'TOKEN_EXPIRED',
    });
  }

  if (err.name === 'NotBeforeError') {
    return res.status(401).json({
      success: false,
      message: 'Token not yet valid.',
      code: 'TOKEN_NOT_ACTIVE',
    });
  }

  // MongoDB connection errors
  if (err.name === 'MongoNetworkError' || err.name === 'MongoTimeoutError') {
    console.error('🚨 Database connection error:', err.message);
    return res.status(503).json({
      success: false,
      message: 'Database temporarily unavailable. Please try again later.',
      code: 'DATABASE_ERROR',
    });
  }

  // Rate limiting errors (from express-rate-limit)
  if (err.status === 429) {
    return res.status(429).json({
      success: false,
      message: 'Too many requests. Please slow down and try again later.',
      code: 'RATE_LIMIT_EXCEEDED',
    });
  }

  // CORS errors
  if (err.message && err.message.includes('CORS')) {
    console.error('🚨 CORS violation from:', req.headers.origin);
    return res.status(403).json({
      success: false,
      message: 'Access denied by CORS policy.',
      code: 'CORS_DENIED',
    });
  }

  // PayloadTooLargeError (body size exceeded)
  if (err.type === 'entity.too.large') {
    return res.status(413).json({
      success: false,
      message: 'Request payload too large.',
      code: 'PAYLOAD_TOO_LARGE',
    });
  }

  // SyntaxError (malformed JSON)
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    return res.status(400).json({
      success: false,
      message: 'Invalid JSON format in request body.',
      code: 'INVALID_JSON',
    });
  }

  // Custom AppError with statusCode
  if (err.statusCode && err.isOperational) {
    return res.status(err.statusCode).json({
      success: false,
      message: err.message,
      code: err.code || 'OPERATIONAL_ERROR',
      // Include additional error data if provided
      ...(err.data && { data: err.data }),
    });
  }

  // Default error response (500 Internal Server Error)
  const statusCode = err.statusCode || 500;
  
  // In production, hide internal error details
  const message = IS_PRODUCTION 
    ? 'An unexpected error occurred. Please try again later.'
    : err.message || 'Internal Server Error';

  res.status(statusCode).json({
    success: false,
    message,
    code: 'INTERNAL_ERROR',
    // Only include stack trace in development
    ...(process.env.NODE_ENV === 'development' && {
      stack: err.stack,
      error: {
        name: err.name,
        message: err.message,
      },
    }),
  });
};

/**
 * Async error wrapper to catch errors in async route handlers
 * Usage: asyncHandler(async (req, res) => { ... })
 */
export const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

/**
 * Custom error class for operational errors
 * These are expected errors that we handle gracefully
 */
export class AppError extends Error {
  constructor(message, statusCode, code = null, data = null) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.data = data;
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * 404 Not Found handler
 * Use this BEFORE the main error handler
 */
export const notFoundHandler = (req, res, next) => {
  console.warn(`⚠️ 404: ${req.method} ${req.originalUrl} from ${req.ip}`);
  
  res.status(404).json({
    success: false,
    message: 'The requested resource was not found.',
    code: 'NOT_FOUND',
    path: req.originalUrl,
  });
};

/**
 * Security-focused error logger
 * Logs security-related errors for monitoring
 */
export const logSecurityError = (type, details, req) => {
  const logEntry = {
    timestamp: new Date().toISOString(),
    type,
    ip: req.ip,
    userAgent: req.get('user-agent'),
    path: req.path,
    method: req.method,
    user: req.user?.userId || 'anonymous',
    details,
  };

  console.error('🚨 SECURITY EVENT:', JSON.stringify(logEntry));

  // TODO: Send to security monitoring system (SIEM)
  // Example: await sendToSecurityMonitoring(logEntry);
};

/**
 * Handle unhandled promise rejections
 * Should be set up in server.js
 */
export const handleUnhandledRejection = (err) => {
  console.error('❌ UNHANDLED REJECTION:', err);
  console.error('Stack:', err.stack);

  // Send to error tracking
  if (global.Sentry) {
    global.Sentry.captureException(err);
  }

  // In production, exit process and let process manager restart
  if (IS_PRODUCTION) {
    console.error('⚠️ Shutting down due to unhandled rejection...');
    process.exit(1);
  }
};

/**
 * Handle uncaught exceptions
 * Should be set up in server.js
 */
export const handleUncaughtException = (err) => {
  console.error('❌ UNCAUGHT EXCEPTION:', err);
  console.error('Stack:', err.stack);

  // Send to error tracking
  if (global.Sentry) {
    global.Sentry.captureException(err);
  }

  // Always exit on uncaught exception
  console.error('⚠️ Shutting down due to uncaught exception...');
  process.exit(1);
};

/**
 * Validation error helper
 * Create standardized validation errors
 */
export const validationError = (field, message) => {
  return new AppError(
    message || `Invalid ${field}`,
    400,
    'VALIDATION_ERROR',
    { field }
  );
};

/**
 * Authorization error helper
 */
export const authorizationError = (message = 'Access denied') => {
  return new AppError(message, 403, 'AUTHORIZATION_ERROR');
};

/**
 * Authentication error helper
 */
export const authenticationError = (message = 'Authentication required') => {
  return new AppError(message, 401, 'AUTHENTICATION_ERROR');
};

/**
 * Not found error helper
 */
export const notFoundError = (resource = 'Resource') => {
  return new AppError(`${resource} not found`, 404, 'NOT_FOUND');
};

/**
 * Database error helper
 */
export const databaseError = (message = 'Database operation failed') => {
  return new AppError(message, 500, 'DATABASE_ERROR');
};

export default {
  errorHandler,
  asyncHandler,
  AppError,
  notFoundHandler,
  logSecurityError,
  handleUnhandledRejection,
  handleUncaughtException,
  validationError,
  authorizationError,
  authenticationError,
  notFoundError,
  databaseError,
};
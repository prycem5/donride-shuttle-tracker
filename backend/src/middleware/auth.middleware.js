import jwt from 'jsonwebtoken';
import rateLimit from 'express-rate-limit';

// ============================================================================
// PRODUCTION-READY AUTHENTICATION MIDDLEWARE
// ============================================================================

// Validate JWT Secret on startup
if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
  throw new Error(
    '🔴 SECURITY ERROR: JWT_SECRET must be at least 32 characters long. ' +
    'Generate one with: node -e "console.log(require(\'crypto\').randomBytes(64).toString(\'hex\'))"'
  );
}

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRE = process.env.JWT_EXPIRE || '15m';

// In-memory store for failed auth attempts (use Redis in production for distributed systems)
const failedAttempts = new Map();
const MAX_FAILED_ATTEMPTS = 5;
const BLOCK_DURATION = 15 * 60 * 1000; // 15 minutes

/**
 * Track failed authentication attempts
 */
const trackFailedAttempt = (ip) => {
  const now = Date.now();
  const attempts = failedAttempts.get(ip) || { count: 0, firstAttempt: now, blockedUntil: null };

  // Check if IP is currently blocked
  if (attempts.blockedUntil && now < attempts.blockedUntil) {
    return { blocked: true, remainingTime: Math.ceil((attempts.blockedUntil - now) / 1000) };
  }

  // Reset if block period has passed
  if (attempts.blockedUntil && now >= attempts.blockedUntil) {
    failedAttempts.delete(ip);
    return { blocked: false };
  }

  // Reset counter if 15 minutes have passed since first attempt
  if (now - attempts.firstAttempt > BLOCK_DURATION) {
    attempts.count = 1;
    attempts.firstAttempt = now;
  } else {
    attempts.count++;
  }

  // Block if max attempts reached
  if (attempts.count >= MAX_FAILED_ATTEMPTS) {
    attempts.blockedUntil = now + BLOCK_DURATION;
    console.error(`🚨 SECURITY ALERT: IP ${ip} blocked for ${BLOCK_DURATION / 60000} minutes after ${MAX_FAILED_ATTEMPTS} failed attempts`);
    return { blocked: true, remainingTime: BLOCK_DURATION / 1000 };
  }

  failedAttempts.set(ip, attempts);
  return { blocked: false };
};

/**
 * Clear failed attempts on successful auth
 */
const clearFailedAttempts = (ip) => {
  failedAttempts.delete(ip);
};

/**
 * Main authentication middleware
 * Verifies JWT token and attaches user info to request
 */
export const authMiddleware = async (req, res, next) => {
  const ip = req.ip || req.connection.remoteAddress;

  try {
    // Check if IP is blocked due to too many failed attempts
    const attemptStatus = trackFailedAttempt(ip);
    if (attemptStatus.blocked) {
      return res.status(429).json({
        success: false,
        message: `Too many failed authentication attempts. Please try again in ${attemptStatus.remainingTime} seconds.`,
        code: 'AUTH_RATE_LIMIT_EXCEEDED',
        retryAfter: attemptStatus.remainingTime,
      });
    }

    const authHeader = req.headers.authorization;

    // Check for Authorization header
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required. Please provide a valid token.',
        code: 'AUTH_REQUIRED',
      });
    }

    const token = authHeader.substring(7);

    // Validate token format (basic check)
    if (!token || token.split('.').length !== 3) {
      return res.status(401).json({
        success: false,
        message: 'Invalid token format.',
        code: 'INVALID_TOKEN_FORMAT',
      });
    }

    // Check for server configuration
    if (!process.env.JWT_SECRET) {
      console.error('❌ JWT_SECRET not defined');
      return res.status(500).json({
        success: false,
        message: 'Server configuration error',
        code: 'SERVER_CONFIG_ERROR',
      });
    }

    // Verify JWT token
    const decoded = jwt.verify(token, JWT_SECRET, {
      algorithms: ['HS256'], // Explicitly set allowed algorithms
      clockTolerance: 5, // Allow 5 seconds clock skew
    });

    // Validate token payload structure
    if (!decoded.userId || !decoded.role) {
      console.warn(`⚠️ Invalid token payload from ${ip}: missing userId or role`);
      return res.status(401).json({
        success: false,
        message: 'Invalid token payload.',
        code: 'INVALID_TOKEN_PAYLOAD',
      });
    }

    // Validate role is one of allowed roles
    const allowedRoles = ['student', 'driver', 'admin'];
    if (!allowedRoles.includes(decoded.role)) {
      console.warn(`⚠️ Invalid role in token from ${ip}: ${decoded.role}`);
      return res.status(401).json({
        success: false,
        message: 'Invalid user role.',
        code: 'INVALID_ROLE',
      });
    }

    // Attach user info to request
    req.user = {
      userId: decoded.userId,
      driverId: decoded.driverId || null,
      role: decoded.role,
      tokenIat: decoded.iat,
      tokenExp: decoded.exp,
    };

    // Clear failed attempts on successful auth
    clearFailedAttempts(ip);

    // Log successful auth (optional, for audit trail)
    if (process.env.LOG_AUTH_SUCCESS === 'true') {
      console.log(`✅ Auth success: ${decoded.role} ${decoded.userId} from ${ip}`);
    }

    next();
  } catch (error) {
    // Log auth failure (important for security monitoring)
    console.warn(`⚠️ Auth failed from ${ip}: ${error.message}`);

    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Token has expired. Please login again.',
        code: 'TOKEN_EXPIRED',
      });
    }

    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: 'Invalid token. Please login again.',
        code: 'INVALID_TOKEN',
      });
    }

    if (error.name === 'NotBeforeError') {
      return res.status(401).json({
        success: false,
        message: 'Token not yet valid.',
        code: 'TOKEN_NOT_ACTIVE',
      });
    }

    // Generic error (don't expose internal details)
    return res.status(401).json({
      success: false,
      message: 'Authentication failed.',
      code: 'AUTH_FAILED',
    });
  }
};

/**
 * Driver-only middleware
 * Must be used AFTER authMiddleware
 */
export const driverOnly = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required.',
      code: 'AUTH_REQUIRED',
    });
  }

  if (req.user.role !== 'driver') {
    console.warn(`⚠️ Access denied: ${req.user.role} ${req.user.userId} attempted driver-only route`);
    return res.status(403).json({
      success: false,
      message: 'Access denied. Driver privileges required.',
      code: 'INSUFFICIENT_PRIVILEGES',
    });
  }

  next();
};

/**
 * Admin-only middleware
 * Must be used AFTER authMiddleware
 */
export const adminOnly = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required.',
      code: 'AUTH_REQUIRED',
    });
  }

  if (req.user.role !== 'admin') {
    console.warn(`⚠️ Access denied: ${req.user.role} ${req.user.userId} attempted admin-only route`);
    return res.status(403).json({
      success: false,
      message: 'Access denied. Administrator privileges required.',
      code: 'INSUFFICIENT_PRIVILEGES',
    });
  }

  next();
};

/**
 * Optional authentication
 * SECURITY: Only use this for truly public endpoints that BENEFIT from user context
 * DO NOT use this for endpoints that should be authenticated
 */
export const optionalAuth = (req, res, next) => {
  const authHeader = req.headers.authorization;

  // If no auth header, continue without user context
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next();
  }

  try {
    const token = authHeader.substring(7);
    const decoded = jwt.verify(token, JWT_SECRET, {
      algorithms: ['HS256'],
    });

    // Validate basic payload structure
    if (decoded.userId && decoded.role) {
      const allowedRoles = ['student', 'driver', 'admin'];
      if (allowedRoles.includes(decoded.role)) {
        req.user = {
          userId: decoded.userId,
          driverId: decoded.driverId || null,
          role: decoded.role,
        };
      }
    }
  } catch (error) {
    // Log but don't fail - this is optional auth
    console.debug(`Optional auth failed: ${error.message}`);
  }

  next();
};

/**
 * Generate JWT token (for login)
 */
export const generateToken = (payload) => {
  // Validate payload
  if (!payload.userId || !payload.role) {
    throw new Error('Invalid token payload: userId and role required');
  }

  const allowedRoles = ['student', 'driver', 'admin'];
  if (!allowedRoles.includes(payload.role)) {
    throw new Error('Invalid role');
  }

  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: JWT_EXPIRE,
    issuer: 'shuttle-tracker-api',
    audience: 'shuttle-tracker-app',
  });
};

/**
 * Verify token (utility function)
 */
export const verifyToken = (token) => {
  return jwt.verify(token, JWT_SECRET, {
    algorithms: ['HS256'],
    issuer: 'shuttle-tracker-api',
    audience: 'shuttle-tracker-app',
  });
};

/**
 * Express rate limiter for auth routes (additional layer)
 */
export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 requests per window
  message: {
    success: false,
    message: 'Too many authentication attempts. Please try again later.',
    code: 'AUTH_RATE_LIMIT',
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    console.error(`🚨 Auth rate limit exceeded: ${req.ip}`);
    res.status(429).json({
      success: false,
      message: 'Too many authentication attempts. Please try again later.',
      code: 'AUTH_RATE_LIMIT',
    });
  },
});

export default {
  authMiddleware,
  driverOnly,
  adminOnly,
  optionalAuth,
  generateToken,
  verifyToken,
  authRateLimiter,
};
import "dotenv/config";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import compression from "compression";
// REMOVE THIS LINE: import mongoSanitize from "express-mongo-sanitize";
import rateLimit from "express-rate-limit";
import { connectDB } from "./lib/db/connect.js";
import { errorHandler } from "./middleware/error.middleware.js";

// Import routes
import authRoutes from "./routes/auth.routes.js";
import stopsRoutes from "./routes/stops.routes.js";
import shuttlesRoutes from "./routes/shuttles.routes.js";
import driverRoutes from "./routes/driver.routes.js";
import pushRoutes from "./routes/push.routes.js";
import webhooksRoutes from "./routes/webhooks.routes.js";
import routesRoutes from "./routes/routes.routes.js";
import arrivalsRoutes from "./routes/arrivals.routes.js";
import realtimeRoutes from "./routes/realtime.routes.js";


const app = express();
const PORT = process.env.PORT || 5000;
const IS_PRODUCTION = process.env.NODE_ENV === "production";

// ============================================================================
// ENVIRONMENT VALIDATION
// ============================================================================

console.log("🔐 Validating environment configuration...");

const requiredEnvVars = [
  "MONGODB_URI",
  "JWT_SECRET",
  "CLERK_SECRET_KEY",
  "ABLY_API_KEY",
];
const missingVars = requiredEnvVars.filter((varName) => !process.env[varName]);

if (missingVars.length > 0) {
  console.error(`🔴 Missing environment variables: ${missingVars.join(", ")}`);
  process.exit(1);
}

if (process.env.JWT_SECRET && process.env.JWT_SECRET.length < 32) {
  console.error("🔴 JWT_SECRET must be at least 32 characters!");
  process.exit(1);
}

console.log("✅ Environment validation passed");

// ============================================================================
// SECURITY HEADERS
// ============================================================================

app.use(
  helmet({
    contentSecurityPolicy: false,
    crossOriginResourcePolicy: { policy: "cross-origin" },
    crossOriginOpenerPolicy: { policy: "same-origin-allow-popups" },
  })
);

// ============================================================================
// CUSTOM NOSQL INJECTION PREVENTION
// ============================================================================

app.use((req, res, next) => {
  try {
    // Only sanitize body (it's writable)
    if (req.body && typeof req.body === "object") {
      req.body = sanitizeObject(req.body);
    }
    next();
  } catch (error) {
    console.error("Sanitization error:", error);
    next();
  }
});

// Sanitization helper
function sanitizeObject(obj) {
  if (obj === null || typeof obj !== "object") {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(sanitizeObject);
  }

  const sanitized = {};
  for (const [key, value] of Object.entries(obj)) {
    // Block MongoDB operators
    if (key.startsWith("$") || key.includes(".")) {
      console.warn(`⚠️ Blocked key: ${key}`);
      continue;
    }

    sanitized[key] = typeof value === "object" ? sanitizeObject(value) : value;
  }

  return sanitized;
}

// ============================================================================
// CORS CONFIGURATION
// ============================================================================

// server.js
const allowedOrigins = IS_PRODUCTION
  ? [
      'https://pfw-shuttle.vercel.app',           // ← ADD THIS
      'https://pfw-shuttle-*.vercel.app'          // All Vercel previews
    ]
  : ['http://localhost:3000', 'http://localhost:3001'];

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (mobile apps, Postman, etc.)
      if (!origin) return callback(null, true);
      
      // Check if origin matches allowed patterns
      const isAllowed = allowedOrigins.some(allowed => {
        if (allowed.includes('*')) {
          // Handle wildcard domains
          const pattern = allowed.replace('*', '.*');
          return new RegExp(pattern).test(origin);
        }
        return origin === allowed;
      });
      
      if (isAllowed) {
        callback(null, true);
      } else {
        console.warn(`⚠️ CORS blocked: ${origin}`);
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

// ============================================================================
// BODY PARSING
// ============================================================================

app.use(express.json({ limit: "1mb", strict: true }));
app.use(
  express.urlencoded({ extended: true, limit: "1mb", parameterLimit: 100 })
);

// ============================================================================
// COMPRESSION & LOGGING
// ============================================================================

app.use(compression());
app.use(IS_PRODUCTION ? morgan("combined") : morgan("dev"));

// ============================================================================
// RATE LIMITING
// ============================================================================

const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: IS_PRODUCTION ? 300 : 1000,
  message: {
    success: false,
    message: "Too many requests. Please try again later.",
    code: "RATE_LIMIT_EXCEEDED",
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    console.warn(`⚠️ Rate limit: ${req.ip}`);
    res.status(429).json({
      success: false,
      message: "Too many requests.",
      code: "RATE_LIMIT_EXCEEDED",
    });
  },
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  skipSuccessfulRequests: true,
  handler: (req, res) => {
    console.error(`🚨 Auth rate limit: ${req.ip}`);
    res.status(429).json({
      success: false,
      message: "Too many login attempts.",
      code: "AUTH_RATE_LIMIT",
    });
  },
});

const driverPingLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  handler: (req, res) => {
    res.status(429).json({
      success: false,
      message: "Ping rate limit exceeded.",
      code: "PING_RATE_LIMIT",
    });
  },
});

app.use("/api/", generalLimiter);
app.use("/api/auth/", authLimiter);
app.use("/api/driver/ping", driverPingLimiter);

// ============================================================================
// REQUEST ID
// ============================================================================

app.use((req, res, next) => {
  req.id = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  res.setHeader("X-Request-ID", req.id);
  next();
});

// ============================================================================
// ROUTES
// ============================================================================

app.get("/health", (_req, res) => {
  res.json({
    success: true,
    status: "healthy",
    timestamp: new Date().toISOString(),
    uptime: Math.floor(process.uptime()),
  });
});

app.get("/", (_req, res) => {
  res.json({
    success: true,
    message: "Shuttle Tracker API",
    version: "1.0.0",
    status: "running",
    timestamp: new Date().toISOString(),
    endpoints: {
      auth: "/api/auth",
      stops: "/api/stops",
      shuttles: "/api/shuttles",
      routes: "/api/routes",
      driver: "/api/driver",
      arrivals: "/api/arrivals",
      push: "/api/push",
      webhooks: "/api/webhooks",
    },
  });
});

app.use("/api/auth", authRoutes);
app.use("/api/realtime", realtimeRoutes);
app.use("/api/stops", stopsRoutes);
app.use("/api/shuttles", shuttlesRoutes);
app.use("/api/driver", driverRoutes);
app.use("/api/push", pushRoutes);
app.use("/api/routes", routesRoutes);
app.use("/api/arrivals", arrivalsRoutes);
app.use(
  "/api/webhooks",
  express.raw({ type: "application/json" }),
  webhooksRoutes
);

// ============================================================================
// ERROR HANDLING
// ============================================================================

// 404 handler
app.use((req, res) => {
  console.warn(`⚠️ 404: ${req.method} ${req.originalUrl}`);
  res.status(404).json({
    success: false,
    message: "Resource not found.",
    code: "NOT_FOUND",
  });
});

// Main error handler
app.use(errorHandler);

// ============================================================================
// SERVER STARTUP
// ============================================================================

const startServer = async () => {
  try {
    console.log("🔌 Connecting to MongoDB...");
    await connectDB();

    const server = app.listen(PORT, () => {
      console.log("");
      console.log("═".repeat(60));
      console.log("🚀 Shuttle Tracker API Server");
      console.log("═".repeat(60));
      console.log(`📍 Environment: ${process.env.NODE_ENV || "development"}`);
      console.log(`🌐 Port: ${PORT}`);
      console.log(
        `🔒 Security: ${IS_PRODUCTION ? "PRODUCTION" : "DEVELOPMENT"}`
      );
      console.log("═".repeat(60));
      console.log("");
    });

    const gracefulShutdown = async (signal) => {
      console.log(`\n${signal} received. Shutting down...`);
      server.close(async () => {
        console.log("✅ Server closed");
        try {
          const mongoose = await import("mongoose");
          await mongoose.default.connection.close();
          console.log("✅ Database closed");
        } catch (err) {
          console.error("❌ Error:", err);
        }
        process.exit(0);
      });

      setTimeout(() => {
        console.error("⚠️ Forced shutdown");
        process.exit(1);
      }, 10000);
    };

    process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
    process.on("SIGINT", () => gracefulShutdown("SIGINT"));
  } catch (error) {
    console.error("❌ Failed to start:", error);
    process.exit(1);
  }
};

process.on("unhandledRejection", (err) => {
  console.error("❌ Unhandled Rejection:", err);
  if (IS_PRODUCTION) process.exit(1);
});

process.on("uncaughtException", (err) => {
  console.error("❌ Uncaught Exception:", err);
  process.exit(1);
});

startServer();

export default app;

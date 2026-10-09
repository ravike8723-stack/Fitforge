"use strict";

/**
 * Security Middleware Suite (Phase A.5)
 *
 * Implements:
 * 1. HTTP Security Headers (Content Security Policy, HSTS, X-Content-Type-Options, X-Frame-Options, Referrer-Policy)
 * 2. Recursive NoSQL Injection Sanitizer
 * 3. In-memory Rate Limiting (Auth, Inquiries, Voice, General)
 * 4. Strict Production CORS configuration
 */

// ─── 1. HTTP Security Headers Middleware ──────────────────────────────────────
function securityHeaders(req, res, next) {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "SAMEORIGIN");
  res.setHeader("X-XSS-Protection", "1; mode=block");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader("Permissions-Policy", "camera=(), microphone=(self), geolocation=()");

  if (process.env.NODE_ENV === "production") {
    res.setHeader("Strict-Transport-Security", "max-age=31536000; includeSubDomains; preload");
  }

  // Content Security Policy allowing Google Fonts, Tailwind CDN, Unpkg Lucide, and self-assets
  res.setHeader(
    "Content-Security-Policy",
    "default-src 'self'; font-src 'self' data: https://fonts.gstatic.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; script-src 'self' 'unsafe-inline' https://cdn.tailwindcss.com https://unpkg.com; img-src 'self' data: https:; connect-src 'self';"
  );

  next();
}

// ─── 2. Recursive NoSQL Injection Sanitizer ──────────────────────────────────
function sanitizeObject(obj) {
  if (!obj || typeof obj !== "object") return obj;

  if (Array.isArray(obj)) {
    return obj.map(sanitizeObject);
  }

  const clean = {};
  for (const key of Object.keys(obj)) {
    // Strip keys that start with $ (MongoDB query operators) or contain dots
    if (!key.startsWith("$") && !key.includes(".")) {
      clean[key] = sanitizeObject(obj[key]);
    }
  }
  return clean;
}

function noSqlSanitizer(req, res, next) {
  if (req.body) req.body = sanitizeObject(req.body);
  if (req.query) req.query = sanitizeObject(req.query);
  if (req.params) req.params = sanitizeObject(req.params);
  next();
}

// ─── 3. In-Memory Rate Limiter ───────────────────────────────────────────────
function createRateLimiter({ windowMs, maxRequests, message }) {
  const ipHits = new Map();

  // Periodically clean up old buckets
  setInterval(() => {
    const now = Date.now();
    for (const [ip, data] of ipHits.entries()) {
      if (now - data.startTime > windowMs) {
        ipHits.delete(ip);
      }
    }
  }, Math.max(10000, windowMs)).unref();

  return function rateLimiter(req, res, next) {
    // In test environment, do not block
    if (process.env.NODE_ENV === "test") return next();

    const ip = req.ip || req.headers["x-forwarded-for"] || req.socket.remoteAddress || "unknown_ip";
    const now = Date.now();

    let entry = ipHits.get(ip);
    if (!entry || now - entry.startTime > windowMs) {
      entry = { startTime: now, count: 1 };
      ipHits.set(ip, entry);
      return next();
    }

    entry.count++;
    if (entry.count > maxRequests) {
      res.setHeader("Retry-After", Math.ceil((windowMs - (now - entry.startTime)) / 1000));
      return res.status(429).json({
        success: false,
        message: message || "Too many requests. Please try again later.",
      });
    }

    next();
  };
}

const authLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 25,
  message: "Too many authentication attempts from this IP. Please try again in 15 minutes.",
});

const inquiryLimiter = createRateLimiter({
  windowMs: 60 * 60 * 1000, // 1 hour
  maxRequests: 20,
  message: "Too many inquiries submitted. Please call us directly if you need immediate assistance.",
});

const voiceLimiter = createRateLimiter({
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 60,
  message: "Too many voice requests. Please try again shortly.",
});

// ─── 4. Strict CORS Options ──────────────────────────────────────────────────
function getCorsOptions() {
  const isProduction = process.env.NODE_ENV === "production";
  const allowedOrigin = process.env.FRONTEND_URL || "http://localhost:5000";

  return {
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps, curl, or same-origin static files)
      if (!origin) return callback(null, true);

      if (!isProduction) {
        // In development, allow localhost origins
        return callback(null, true);
      }

      if (origin === allowedOrigin || origin.endsWith(".fitforge.training")) {
        return callback(null, true);
      }

      return callback(new Error("CORS Policy: Origin not permitted."));
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
  };
}

module.exports = {
  securityHeaders,
  noSqlSanitizer,
  authLimiter,
  inquiryLimiter,
  voiceLimiter,
  getCorsOptions,
};

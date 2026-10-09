"use strict";

// ─── Load environment variables first ────────────────────────────────────────
require("dotenv").config();

const express  = require("express");
const cors     = require("cors");
const path     = require("path");
const { connectDB, disconnectDB, isDatabaseConnected } = require("./config/db");
const { validateEnvironment } = require("./config/envValidator");
const {
  securityHeaders,
  noSqlSanitizer,
  authLimiter,
  inquiryLimiter,
  voiceLimiter,
  getCorsOptions,
} = require("./middleware/security");
const { getHealthStatus } = require("./controllers/healthController");
const siteContent = require("../src/config/siteContent");

// Run environment verification on startup
validateEnvironment();

// ─── Register Mongoose models ─────────────────────────────────────────────────
require("./models/User");
require("./models/WellnessGoal");
require("./models/Service");
require("./models/Therapist");
require("./models/Availability");
require("./models/Booking");
require("./models/Setting");
require("./models/CallLog");

const app  = express();
const PORT = process.env.PORT || 5000;

app.set("trust proxy", 1);

// ─── Security Middlewares ─────────────────────────────────────────────────────
app.use(securityHeaders);
app.use(cors(getCorsOptions()));
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true, limit: "1mb" }));
app.use(noSqlSanitizer);

// ─── Health & Centralized Content Endpoints (public, non-blocking) ────────────
app.get("/health", getHealthStatus);
app.get("/api/health", getHealthStatus);
app.get("/api/content", (req, res) => {
  res.json({ success: true, data: siteContent });
});

// ─── Database availability check for DB-backed API endpoints ──────────────────
app.use("/api", (req, res, next) => {
  if (req.path === "/health" || req.path === "/content") return next();

  if (!isDatabaseConnected()) {
    return res.status(503).json({
      success: false,
      message: "Database service is running in frontend demo mode.",
    });
  }
  next();
});

// ─── Serve static files ───────────────────────────────────────────────────────
app.use(express.static(path.join(__dirname, "../public")));
app.use("/src", express.static(path.join(__dirname, "../src")));

// ─── Rate-limited Route Mounts ────────────────────────────────────────────────
app.use("/api/auth/login", authLimiter);
app.use("/api/auth/register", authLimiter);
app.use("/api/inquiries", inquiryLimiter);
app.use("/api/voice", voiceLimiter);

// ─── API Routes ───────────────────────────────────────────────────────────────
app.use("/api/auth",         require("./routes/authRoutes"));
app.use("/api/voice",        require("./routes/voiceRoutes"));
app.use("/api/inquiries",    require("./routes/inquiryRoutes"));
app.use("/api/contact",      require("./routes/inquiryRoutes"));
app.post("/api/ai/chat", async (req, res) => {
  try {
    const { processCallerTurn } = require("./services/ai/aiReceptionistEngine");
    const session = { callSid: "web-chat-" + Date.now(), callerNumber: "web-client" };
    const result = await processCallerTurn(session, req.body.message || "Hello");
    res.json({ success: true, reply: result.responseSpeech, action: result.action });
  } catch (e) {
    res.json({
      success: true,
      reply: "Welcome to FitForge Personal Training & Online Coaching! How can Coach Alex help you reach your fitness goals?",
    });
  }
});
app.use("/api/goals",        require("./routes/wellnessGoalRoutes"));
app.use("/api/services",     require("./routes/serviceRoutes"));
app.use("/api/therapists",   require("./routes/therapistRoutes"));
app.use("/api/availability", require("./routes/availabilityRoutes"));

const { adminSettingRouter } = require("./routes/settingRoutes");
app.use("/api/settings",       require("./routes/settingRoutes"));
app.use("/api/admin/settings", adminSettingRouter);

app.use("/api/admin/analytics", require("./routes/analyticsRoutes"));

const { adminRouter: adminBookingRouter } = require("./routes/bookingRoutes");
app.use("/api/bookings",       require("./routes/bookingRoutes"));
app.use("/api/admin/bookings", adminBookingRouter);

app.get("/api", (req, res) => {
  res.json({ success: true, message: "FitForge Personal Training API v1" });
});

app.use("/api/*", (req, res) => {
  res.status(404).json({
    success: false,
    message: `API route not found: ${req.method} ${req.originalUrl}`,
  });
});

// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error("[Error]", err.message);
  if (process.env.NODE_ENV !== "production") {
    console.error(err.stack);
  }
  res.status(err.status || 500).json({
    success: false,
    message: process.env.NODE_ENV === "production" ? "An unexpected error occurred. Please try again." : err.message,
  });
});

const startServer = async () => {
  try {
    await connectDB();
  } catch (err) {
    if (process.env.NODE_ENV === "production") {
      console.error("[Fatal] Database connection required in production mode. Halting startup.");
      process.exit(1);
    }
    console.warn("[Warning] Server running in standalone demo mode.");
  }

  const server = app.listen(PORT, () => {
    console.log(`FitForge Personal Training Server running on port ${PORT} [${process.env.NODE_ENV || "development"}]`);
    console.log(`Health check ready at http://localhost:${PORT}/health`);
  });

  const handleShutdown = async (signal) => {
    console.log(`\n[Server] Received ${signal}. Shutting down gracefully...`);
    server.close(async () => {
      await disconnectDB();
      process.exit(0);
    });
  };

  process.on("SIGINT", () => handleShutdown("SIGINT"));
  process.on("SIGTERM", () => handleShutdown("SIGTERM"));

  return server;
};

if (require.main === module) {
  startServer();
}

module.exports = { app, startServer };

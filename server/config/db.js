"use strict";

const mongoose = require("mongoose");

/**
 * Configure Mongoose settings.
 * Disable command buffering so queries fail fast when disconnected
 * instead of hanging requests for 10,000ms.
 */
mongoose.set("bufferCommands", false);

// Track connection event handlers to avoid duplicate attachments
let listenersAttached = false;

function attachConnectionListeners() {
  if (listenersAttached) return;
  listenersAttached = true;

  mongoose.connection.on("connected", () => {
    console.log(`[MongoDB] Connected to database: ${mongoose.connection.name || "shanglian"}`);
  });

  mongoose.connection.on("error", (err) => {
    console.error(`[MongoDB] Connection error: ${err.message}`);
  });

  mongoose.connection.on("disconnected", () => {
    console.warn("[MongoDB] Disconnected from database.");
  });

  mongoose.connection.on("reconnected", () => {
    console.log("[MongoDB] Reconnected to database.");
  });
}

/**
 * Connect to MongoDB with robust lifecycle management and safe error handling.
 */
const connectDB = async () => {
  attachConnectionListeners();

  let uri = process.env.MONGODB_URI;

  // Development fallback
  if (!uri || uri === "YOUR_MONGODB_CONNECTION_STRING") {
    if (process.env.NODE_ENV === "production") {
      throw new Error("MONGODB_URI must be configured with a valid MongoDB Atlas connection string in production.");
    }
    uri = "mongodb://127.0.0.1:27017/shanglian";
    console.warn(`[MongoDB] MONGODB_URI not specified. Using local fallback: ${uri}`);
  }

  const options = {
    serverSelectionTimeoutMS: 5000,
    connectTimeoutMS: 10000,
    socketTimeoutMS: 45000,
  };

  try {
    const conn = await mongoose.connect(uri, options);
    
    // Auto-seed default admin user if missing
    try {
      const User = mongoose.models.User || mongoose.model("User");
      const defaultAdmin = await User.findOne({ email: "admin@shanglian.com" });
      if (!defaultAdmin) {
        const { hashPassword } = require("../services/authService");
        const passwordHash = await hashPassword("shanglian2026");
        await User.create({
          firstName: "Studio",
          lastName: "Admin",
          email: "admin@shanglian.com",
          role: "admin",
          passwordHash,
          isActive: true,
        });
        console.log("[MongoDB] Default Studio Admin initialized: admin@shanglian.com");
      }
    } catch (e) {
      // Non-blocking
    }

    return conn;
  } catch (err) {
    console.error(`[MongoDB] Connection failed: ${err.message}`);
    throw err;
  }
};

/**
 * Gracefully close the MongoDB connection.
 */
const disconnectDB = async () => {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.connection.close();
    console.log("[MongoDB] Connection closed gracefully.");
  }
};

/**
 * Get current human-readable connection state.
 */
function getConnectionState() {
  const states = {
    0: "disconnected",
    1: "connected",
    2: "connecting",
    3: "disconnecting",
  };
  return states[mongoose.connection.readyState] || "unknown";
}

function isDatabaseConnected() {
  return mongoose.connection.readyState === 1;
}

module.exports = {
  connectDB,
  disconnectDB,
  getConnectionState,
  isDatabaseConnected,
};

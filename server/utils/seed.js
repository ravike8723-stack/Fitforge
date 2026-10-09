"use strict";

/**
 * server/utils/seed.js
 *
 * Seeds initial FitForge Personal Training programs, coach profile, and business settings.
 */

require("dotenv").config();
const siteContent = require("../../src/config/siteContent");

console.log("=== FitForge Seed Utility ===");
console.log(`Brand: ${siteContent.siteConfig.brandName} — "${siteContent.siteConfig.tagline}"`);
console.log(`Coach: ${siteContent.trainerProfile.fullName}`);
console.log(`Programs loaded: ${siteContent.programs.map((p) => p.name).join(", ")}`);
console.log("Centralized configuration in src/config/siteContent.js is active.");

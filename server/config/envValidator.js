"use strict";

/**
 * Environment Validator (Phase A.5)
 *
 * Validates critical environment variables at startup to prevent silent
 * misconfigurations, insecure defaults in production, or unhandled exceptions.
 */

function validateEnvironment() {
  const isProd = process.env.NODE_ENV === "production";
  const warnings = [];
  const errors = [];

  // 1. JWT Secret
  const jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret || jwtSecret === "your_long_random_jwt_secret_here") {
    if (isProd) {
      errors.push("CRITICAL: JWT_SECRET is unset or using the default placeholder in production!");
    } else {
      warnings.push("WARNING: JWT_SECRET is using a default development placeholder.");
    }
  }

  // 2. Database URI
  const mongoUri = process.env.MONGODB_URI;
  if (!mongoUri || mongoUri.includes("<username>") || mongoUri.includes("YOUR_MONGODB")) {
    if (isProd) {
      errors.push("CRITICAL: MONGODB_URI is unset or using a placeholder string in production!");
    } else {
      warnings.push("WARNING: MONGODB_URI appears unset or placeholder. Database connection may fail.");
    }
  }

  // 3. Frontend / Production URL
  const frontendUrl = process.env.FRONTEND_URL;
  if (isProd && (!frontendUrl || frontendUrl.includes("localhost"))) {
    warnings.push("WARNING: FRONTEND_URL is set to localhost in production mode. CORS or client links may fail.");
  }

  // 4. Email Config
  if (process.env.EMAIL_ENABLED === "true") {
    if (!process.env.ZOHO_SMTP_USER || !process.env.ZOHO_SMTP_PASSWORD || process.env.ZOHO_SMTP_PASSWORD.includes("your_zoho")) {
      if (isProd) {
        errors.push("CRITICAL: EMAIL_ENABLED=true in production but Zoho SMTP credentials are unset or placeholder!");
      } else {
        warnings.push("WARNING: EMAIL_ENABLED=true but Zoho SMTP credentials are incomplete.");
      }
    }
  }

  // 5. Calendar Config
  if (process.env.CALENDAR_ENABLED === "true") {
    if (!process.env.ZOHO_CALENDAR_CLIENT_ID || !process.env.ZOHO_CALENDAR_REFRESH_TOKEN || process.env.ZOHO_CALENDAR_REFRESH_TOKEN.includes("your_refresh")) {
      if (isProd) {
        errors.push("CRITICAL: CALENDAR_ENABLED=true in production but Zoho Calendar OAuth credentials are placeholder!");
      } else {
        warnings.push("WARNING: CALENDAR_ENABLED=true but Zoho Calendar OAuth credentials are incomplete.");
      }
    }
  }

  // 6. Twilio Signature Validation in Production
  if (isProd && process.env.TWILIO_VALIDATE_SIGNATURE === "false") {
    warnings.push("SECURITY WARNING: TWILIO_VALIDATE_SIGNATURE is set to false in production mode. Set to true for production.");
  }

  // Log summary
  if (warnings.length > 0) {
    console.log("\n── Environment Configuration Warnings ──");
    warnings.forEach((w) => console.warn(`  ⚠️  ${w}`));
    console.log("─────────────────────────────────────────\n");
  }

  if (errors.length > 0) {
    console.error("\n── Critical Production Environment Errors ──");
    errors.forEach((e) => console.error(`  ❌  ${e}`));
    console.error("────────────────────────────────────────────\n");
    if (isProd) {
      throw new Error("Startup aborted due to critical production environment misconfiguration.");
    }
  }

  return { isValid: errors.length === 0, warnings, errors };
}

module.exports = { validateEnvironment };

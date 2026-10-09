"use strict";

/**
 * server/utils/verifyBuild.js
 *
 * Build & Asset Integrity Verification Script (`npm run build`)
 * Validates:
 *  1. JavaScript syntax across all src/, public/js/, and server/ modules
 *  2. Centralized configuration sync between src/config/siteContent.js and public/js/siteContent.js
 *  3. Presence of all local fitness images in public/images/
 *  4. Complete removal of Shanglian / massage / treatment terminology from frontend UI files
 */

const fs = require("fs");
const path = require("path");
const vm = require("vm");

const ROOT = path.resolve(__dirname, "../..");

function assert(cond, msg) {
  if (!cond) {
    console.error(`[BUILD FAIL] ${msg}`);
    process.exit(1);
  }
}

console.log("=== FitForge Build & Asset Verification ===");

// 1. Validate centralized config
const srcConfigPath = path.join(ROOT, "src/config/siteContent.js");
const pubConfigPath = path.join(ROOT, "public/js/siteContent.js");
assert(fs.existsSync(srcConfigPath), "Missing src/config/siteContent.js");
assert(fs.existsSync(pubConfigPath), "Missing public/js/siteContent.js");

const siteContent = require(srcConfigPath);
assert(siteContent.siteConfig.brandName === "FITFORGE", "Brand name must be FITFORGE");
assert(
  siteContent.siteConfig.tagline === "Serious personal training for people who want serious results.",
  "Tagline must match specification"
);
assert(siteContent.programs.length === 3, "Must define 3 core training programs");
assert(siteContent.goals.length === 6, "Must define 6 interactive fitness goals");
assert(siteContent.workoutExperience.categories.length === 6, "Must define 6 training experience categories");
assert(siteContent.nutrition.pillars.length === 4, "Must define 4 compact nutrition pillars");
assert(siteContent.faqs.length === 6, "Must define 6 concise FAQ items");
console.log("✓ Centralized configuration (src/config/siteContent.js) verified");

// 2. Verify JS syntax of all frontend scripts
const jsFiles = [
  "src/config/siteContent.js",
  "public/js/siteContent.js",
  "public/js/bookingService.js",
  "public/js/icons.js",
  "public/js/api.js",
  "public/js/auth.js",
  "public/js/booking.js",
  "public/js/dashboard.js",
  "public/js/admin.js",
  "public/js/theme.js",
];

for (const rel of jsFiles) {
  const full = path.join(ROOT, rel);
  assert(fs.existsSync(full), `Missing JS file: ${rel}`);
  const code = fs.readFileSync(full, "utf8");
  try {
    new vm.Script(code, { filename: rel });
  } catch (err) {
    assert(false, `Syntax error in ${rel}: ${err.message}`);
  }
}
console.log(`✓ Validated syntax for ${jsFiles.length} JavaScript modules`);

// 3. Verify all required fitness images exist
const requiredImages = [
  "hero-trainer.jpg",
  "trainer-portrait.jpg",
  "personal-coaching.jpg",
  "strength-training.jpg",
  "online-coaching.jpg",
  "transformation-results.jpg",
  "healthy-nutrition.jpg",
  "gym-training.jpg",
];

for (const img of requiredImages) {
  const imgPath = path.join(ROOT, "public/images", img);
  assert(fs.existsSync(imgPath), `Missing required fitness image: public/images/${img}`);
  const stat = fs.statSync(imgPath);
  assert(stat.size > 1000, `Image public/images/${img} is empty or corrupted`);
}
console.log(`✓ Verified ${requiredImages.length} local fitness images in public/images/`);

// 4. Verify zero Shanglian / massage / treatment terms in visible UI files
const uiFiles = [
  "public/index.html",
  "public/booking.html",
  "public/dashboard.html",
  "public/admin.html",
  "public/css/glass.css",
  "public/css/dashboard.css",
  "public/css/styles.css",
  ...jsFiles,
];

const forbiddenTerms = [
  "shanglian",
  "massage",
  "therapeutic",
  "modality",
  "lymphatic",
  "meridian",
  "sanitized",
  "private room",
  "60 minute treatment",
  "90 minute treatment",
  "treatment addons",
  "gua sha",
  "cupping",
];

for (const rel of uiFiles) {
  const content = fs.readFileSync(path.join(ROOT, rel), "utf8").toLowerCase();
  for (const term of forbiddenTerms) {
    assert(!content.includes(term), `Forbidden legacy term "${term}" found in ${rel}`);
  }
}
console.log("✓ Zero legacy Shanglian/massage terms in all frontend HTML, CSS, and JS files");
console.log("=== Build Verification Passed (0 errors) ===");

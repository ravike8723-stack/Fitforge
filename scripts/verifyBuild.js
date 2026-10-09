"use strict";

/**
 * scripts/verifyBuild.js
 *
 * Frontend Build & Asset Verification Script for FitForge (`npm run build`)
 * Compatible with Vercel deployment and local verification.
 * Validates:
 *  1. Presence and integrity of core HTML pages
 *  2. JavaScript syntax across all frontend scripts
 *  3. Centralized configuration integrity
 *  4. Presence and size of all local fitness images
 *  5. Complete absence of legacy Shanglian/massage terms
 */

const fs = require("fs");
const path = require("path");
const vm = require("vm");

const ROOT = path.resolve(__dirname, "..");

function assert(cond, msg) {
  if (!cond) {
    console.error(`[BUILD FAIL] ${msg}`);
    process.exit(1);
  }
}

console.log("=== FitForge Frontend Build Verification ===");

// 1. Verify Core HTML Pages
const htmlPages = ["index.html", "booking.html", "dashboard.html", "admin.html"];
for (const page of htmlPages) {
  const rootPath = path.join(ROOT, page);
  const pubPath = path.join(ROOT, "public", page);
  assert(fs.existsSync(rootPath) || fs.existsSync(pubPath), `Missing HTML page: ${page}`);
}
console.log(`✓ Verified ${htmlPages.length} core HTML pages`);

function resolveFile(relPath) {
  const p1 = path.join(ROOT, relPath);
  if (fs.existsSync(p1)) return p1;
  const p2 = path.join(ROOT, "public", relPath);
  if (fs.existsSync(p2)) return p2;
  return null;
}

// 2. Validate Centralized Configuration
const configPath = resolveFile("js/siteContent.js");
assert(configPath, "Missing js/siteContent.js");
const siteContent = require(path.join(ROOT, "src/config/siteContent.js"));

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
console.log("✓ Centralized configuration verified");

// 3. Verify JavaScript Syntax
const jsFiles = [
  "js/siteContent.js",
  "js/bookingService.js",
  "js/icons.js",
  "js/api.js",
  "js/auth.js",
  "js/booking.js",
  "js/dashboard.js",
  "js/admin.js",
  "js/theme.js",
  "src/config/siteContent.js"
];

for (const rel of jsFiles) {
  const full = resolveFile(rel);
  if (!full) continue;
  const code = fs.readFileSync(full, "utf8");
  try {
    new vm.Script(code, { filename: rel });
  } catch (err) {
    assert(false, `Syntax error in ${rel}: ${err.message}`);
  }
}
console.log(`✓ Validated syntax for frontend JavaScript modules`);

// 4. Verify Local Fitness Images
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
  const imgPath = resolveFile(path.join("images", img));
  assert(imgPath, `Missing required image: images/${img}`);
  const stat = fs.statSync(imgPath);
  assert(stat.size > 1000, `Image images/${img} is empty or corrupted`);
}
console.log(`✓ Verified ${requiredImages.length} fitness images in images/`);

// 5. Verify Zero Forbidden Legacy Terms
const forbiddenTerms = [
  "shanglian",
  "bookdingo",
  "fleetnimble",
  "massage",
  "therapeutic",
  "modality",
  "lymphatic",
  "meridian",
  "gua sha",
  "cupping",
];

const checkFiles = [
  ...htmlPages,
  "css/glass.css",
  "css/dashboard.css",
  "css/styles.css",
  ...jsFiles,
];

for (const rel of checkFiles) {
  const full = resolveFile(rel);
  if (!full) continue;
  const content = fs.readFileSync(full, "utf8").toLowerCase();
  for (const term of forbiddenTerms) {
    assert(!content.includes(term), `Forbidden legacy term "${term}" found in ${rel}`);
  }
}
console.log("✓ Zero legacy terms in all frontend files");
console.log("=== Build Verification Passed (0 errors) ===");

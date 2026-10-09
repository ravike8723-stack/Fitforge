"use strict";

/**
 * server/utils/smokeTest.js
 *
 * Automated End-to-End & Unit Test Suite for FitForge Personal Training (`npm test`)
 */

const http = require("http");
const assert = require("assert");
const siteContent = require("../../src/config/siteContent");
const BookingService = require("../../public/js/bookingService");
const { app } = require("../index");

async function runTests() {
  console.log("=== FitForge Automated Test Suite ===");
  let passed = 0;

  function test(name, fn) {
    return Promise.resolve()
      .then(fn)
      .then(() => {
        passed++;
        console.log(`  [PASS] ${name}`);
      })
      .catch((err) => {
        console.error(`  [FAIL] ${name}: ${err.message}`);
        process.exit(1);
      });
  }

  // 1. Content Architecture Tests
  await test("Centralized Brand & SEO Configuration", () => {
    assert.strictEqual(siteContent.siteConfig.brandName, "FITFORGE");
    assert.strictEqual(
      siteContent.siteConfig.tagline,
      "Serious personal training for people who want serious results."
    );
    assert.strictEqual(siteContent.siteConfig.seo.title, "FitForge | Personal Training & Online Coaching");
    assert.strictEqual(siteContent.siteConfig.navigation.length, 8);
  });

  await test("Hero & Trainer Profile Content", () => {
    assert.strictEqual(siteContent.hero.headline, "BUILD THE STRONGEST VERSION OF YOU.");
    assert.strictEqual(siteContent.trainerProfile.heading, "MEET YOUR COACH");
    assert.ok(siteContent.trainerProfile.bioParagraphs[0].includes("Hi, I'm Alex"));
    assert.strictEqual(siteContent.trainerProfile.credibilityItems.length, 3);
  });

  await test("Interactive Fitness Goals & Training Programs", () => {
    const goalTitles = siteContent.goals.map((g) => g.title);
    assert.deepStrictEqual(goalTitles, [
      "BUILD MUSCLE",
      "LOSE FAT",
      "GET STRONGER",
      "IMPROVE CONDITIONING",
      "IMPROVE MOBILITY",
      "BUILD CONSISTENCY",
    ]);

    const progNames = siteContent.programs.map((p) => p.name);
    assert.deepStrictEqual(progNames, [
      "PERSONAL TRAINING",
      "ONLINE COACHING",
      "TRANSFORMATION PROGRAM",
    ]);
    assert.strictEqual(siteContent.programs[0].fullPriceDisplay, "$199/month");
    assert.strictEqual(siteContent.programs[1].fullPriceDisplay, "$129/month");
    assert.strictEqual(siteContent.programs[2].fullPriceDisplay, "$399/12 weeks");
  });

  await test("Training Experience, Results, Nutrition, Testimonials & FAQs", () => {
    const cats = siteContent.workoutExperience.categories.map((c) => c.name);
    assert.deepStrictEqual(cats, ["STRENGTH", "HYPERTROPHY", "CONDITIONING", "MOBILITY", "CORE", "RECOVERY"]);
    assert.strictEqual(siteContent.transformations.heading, "REAL PEOPLE. REAL RESULTS.");
    assert.strictEqual(siteContent.transformations.items.length, 3);
    assert.strictEqual(siteContent.nutrition.heading, "TRAINING IS ONLY PART OF THE EQUATION.");
    assert.strictEqual(siteContent.nutrition.pillars.length, 4);
    assert.strictEqual(siteContent.testimonials.length, 3);
    assert.strictEqual(siteContent.faqs.length, 6);
  });

  // 2. BookingService Abstraction Tests
  await test("BookingService Slot Resolution & Booking Creation", async () => {
    const slots = await BookingService.getAvailableSlots({
      programId: "personal-training",
      trainingType: "In-Person",
      date: "2026-11-15",
    });
    assert.ok(Array.isArray(slots) && slots.length > 0);
    assert.ok(slots[0].time);

    const created = await BookingService.createBooking({
      name: "Test Athlete",
      email: "athlete@fitforge.training",
      phone: "+1 415 555 0100",
      programId: "transformation-program",
      programName: "Transformation Program",
      trainingType: "Hybrid",
      date: "2026-11-15",
      time: "09:30 AM",
      goal: "Lose Fat",
    });
    assert.strictEqual(created.success, true);
    assert.ok(created.data.id.startsWith("FF-"));

    const consult = await BookingService.submitConsultation({
      name: "Jordan Taylor",
      email: "jordan@example.com",
      phone: "+1 415 555 0199",
      age: "30",
      fitnessGoal: "Muscle Gain",
      experience: "Intermediate",
      trainingType: "Online",
      preferredDate: "2026-11-20",
      preferredTime: "12:00 PM",
      message: "Looking to build lean mass.",
    });
    assert.strictEqual(consult.success, true);
    assert.ok(consult.data.id.startsWith("CONS-"));
  });

  // 3. HTTP Server & Route Verification
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  const port = server.address().port;

  function fetchUrl(pathUrl) {
    return new Promise((resolve, reject) => {
      http
        .get(`http://127.0.0.1:${port}${pathUrl}`, (res) => {
          let body = "";
          res.on("data", (chunk) => (body += chunk));
          res.on("end", () => resolve({ status: res.statusCode, body }));
        })
        .on("error", reject);
    });
  }

  await test("HTTP GET / serves FitForge homepage with 0 Shanglian references", async () => {
    const res = await fetchUrl("/");
    assert.strictEqual(res.status, 200);
    assert.ok(res.body.includes("FitForge | Personal Training &amp; Online Coaching"));
    assert.ok(res.body.includes("BUILD THE"));
    assert.ok(res.body.includes("STRONGEST"));
    assert.ok(res.body.includes("MEET YOUR COACH"));
    assert.ok(res.body.includes("WHAT'S YOUR GOAL?"));
    assert.ok(res.body.includes("REAL PEOPLE."));
    assert.ok(res.body.includes("TRAINING IS ONLY PART OF THE EQUATION."));
    assert.ok(res.body.includes("READY TO GET"));
    assert.ok(!res.body.toLowerCase().includes("shanglian"));
  });

  await test("HTTP GET /booking.html, /dashboard.html, /admin.html return 200 OK", async () => {
    const bRes = await fetchUrl("/booking.html");
    const dRes = await fetchUrl("/dashboard.html");
    const aRes = await fetchUrl("/admin.html");
    assert.strictEqual(bRes.status, 200);
    assert.strictEqual(dRes.status, 200);
    assert.strictEqual(aRes.status, 200);
  });

  await test("HTTP GET /api/content and /health return valid JSON", async () => {
    const cRes = await fetchUrl("/api/content");
    assert.strictEqual(cRes.status, 200);
    const parsed = JSON.parse(cRes.body);
    assert.strictEqual(parsed.success, true);
    assert.strictEqual(parsed.data.siteConfig.brandName, "FITFORGE");

    const hRes = await fetchUrl("/health");
    assert.strictEqual(hRes.status, 200);
    const hParsed = JSON.parse(hRes.body);
    assert.strictEqual(hParsed.service, "fitforge-personal-training");
  });

  await new Promise((resolve) => server.close(resolve));
  console.log(`=== All ${passed} Test Suites Passed (0 failures) ===`);
}

runTests();

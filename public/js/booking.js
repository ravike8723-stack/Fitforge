/**
 * public/js/booking.js
 *
 * Standalone 6-Step Personal Trainer Booking Controller for FitForge (/booking.html).
 * Flow: Select Program → Select Training Type → Select Date → Select Available Time → Enter Contact Details → Confirm
 */

(function () {
  const state = {
    step: 1,
    program: null,
    trainingType: "In-Person",
    date: new Date(Date.now() + 86400000 * 2).toISOString().split("T")[0],
    time: null,
    slots: [],
    confirmedRecord: null,
  };

  function setStep(step) {
    state.step = step;
    for (let i = 1; i <= 6; i++) {
      const dot = document.getElementById(`pageDot${i}`);
      if (dot) dot.classList.toggle("active", i <= step);
    }
    render();
  }

  async function loadSlotsAndAdvance() {
    state.slots = await BookingService.getAvailableSlots({
      programId: state.program?.id || "personal-training",
      trainingType: state.trainingType,
      date: state.date,
    });
    setStep(4);
  }

  function render() {
    const mount = document.getElementById("standaloneBookingMount");
    if (!mount) return;

    const programs = [
      ...(window.SiteContent?.programs || []),
      {
        id: "free-consultation",
        name: "Free 1-on-1 Fitness Consultation",
        duration: "45 Minutes • Goal & Movement Assessment",
        fullPriceDisplay: "FREE ($0)",
        trainingTypeDefault: "In-Person",
      },
    ];

    const trainingTypes = window.SiteContent?.bookingConfig?.trainingTypes || [
      { id: "In-Person", name: "In-Person Coaching", badge: "Studio 1-on-1", description: "Private coaching at FitForge Studio." },
      { id: "Online", name: "Online Coaching", badge: "Remote", description: "Custom app workouts & video coaching anywhere." },
      { id: "Hybrid", name: "Hybrid Coaching", badge: "In-Studio + Remote", description: "Combine studio sessions with remote coaching." },
    ];

    if (state.step === 1) {
      mount.innerHTML = `
        <span class="eyebrow">Step 01 of 06</span>
        <h2 style="font-size: 2rem; margin-bottom: 1.2rem;">Select Program</h2>
        <div style="display: flex; flex-direction: column; gap: 1rem;">
          ${programs
            .map(
              (p) => `
            <div class="glass-card" style="padding: 1.3rem 1.5rem; display: flex; justify-content: space-between; align-items: center; cursor: pointer;"
                 data-prog-id="${p.id}">
              <div>
                <div style="font-weight: 600; font-size: 1.15rem; color: var(--text-light);">${p.name}</div>
                <div style="font-size: 0.82rem; color: var(--text-muted);">${p.duration}</div>
              </div>
              <div style="display: flex; align-items: center; gap: 1rem;">
                <span style="font-family: var(--font-serif); font-size: 1.35rem; color: var(--gold-light); font-weight: 600;">${p.fullPriceDisplay}</span>
                <button type="button" class="btn btn-gold btn-sm">Select →</button>
              </div>
            </div>
          `
            )
            .join("")}
        </div>
      `;
      mount.querySelectorAll("[data-prog-id]").forEach((el) => {
        el.addEventListener("click", () => {
          const id = el.getAttribute("data-prog-id");
          state.program = programs.find((p) => p.id === id) || programs[0];
          state.trainingType = state.program.trainingTypeDefault || "In-Person";
          setStep(2);
        });
      });
    } else if (state.step === 2) {
      mount.innerHTML = `
        <span class="eyebrow">Step 02 of 06</span>
        <h2 style="font-size: 2rem; margin-bottom: 1.2rem;">Select Training Type</h2>
        <div style="display: flex; flex-direction: column; gap: 1rem;">
          ${trainingTypes
            .map(
              (t) => `
            <div class="glass-card" style="padding: 1.3rem 1.5rem; display: flex; justify-content: space-between; align-items: center; cursor: pointer;"
                 data-type-id="${t.id}">
              <div>
                <div style="font-weight: 600; font-size: 1.15rem; color: var(--text-light);">${t.name} <span class="glass-pill" style="font-size:0.7rem;margin-left:0.5rem;">${t.badge}</span></div>
                <div style="font-size: 0.82rem; color: var(--text-muted); margin-top: 0.25rem;">${t.description}</div>
              </div>
              <button type="button" class="btn btn-glass btn-sm">Choose →</button>
            </div>
          `
            )
            .join("")}
        </div>
        <div style="margin-top: 1.8rem;">
          <button type="button" class="btn btn-glass btn-sm" id="backStep1">← Back</button>
        </div>
      `;
      document.getElementById("backStep1")?.addEventListener("click", () => setStep(1));
      mount.querySelectorAll("[data-type-id]").forEach((el) => {
        el.addEventListener("click", () => {
          state.trainingType = el.getAttribute("data-type-id");
          setStep(3);
        });
      });
    } else if (state.step === 3) {
      mount.innerHTML = `
        <span class="eyebrow">Step 03 of 06</span>
        <h2 style="font-size: 2rem; margin-bottom: 1.2rem;">Select Date</h2>
        <div class="form-group">
          <label class="form-label" for="standaloneDate">Preferred Coaching Date</label>
          <input type="date" id="standaloneDate" class="form-control" value="${state.date}" min="${new Date().toISOString().split("T")[0]}" />
        </div>
        <div style="margin-top: 1.8rem; display: flex; justify-content: space-between;">
          <button type="button" class="btn btn-glass btn-sm" id="backStep2">← Back</button>
          <button type="button" class="btn btn-gold btn-sm" id="nextStep4">View Available Times →</button>
        </div>
      `;
      document.getElementById("backStep2")?.addEventListener("click", () => setStep(2));
      document.getElementById("nextStep4")?.addEventListener("click", () => {
        const d = document.getElementById("standaloneDate")?.value;
        if (d) state.date = d;
        loadSlotsAndAdvance();
      });
    } else if (state.step === 4) {
      mount.innerHTML = `
        <span class="eyebrow">Step 04 of 06</span>
        <h2 style="font-size: 2rem; margin-bottom: 1rem;">Select Available Time (${state.date})</h2>
        <div class="slot-grid">
          ${state.slots
            .map((s) =>
              s.available
                ? `<div class="slot-pill ${state.time === s.time ? "selected" : ""}" data-slot="${s.time}">${s.time}</div>`
                : `<div class="slot-pill unavailable">${s.time}</div>`
            )
            .join("")}
        </div>
        <div style="margin-top: 2rem; display: flex; justify-content: space-between;">
          <button type="button" class="btn btn-glass btn-sm" id="backStep3">← Back</button>
          <button type="button" class="btn btn-gold btn-sm" id="nextStep5" ${state.time ? "" : "disabled"}>Continue to Details →</button>
        </div>
      `;
      document.getElementById("backStep3")?.addEventListener("click", () => setStep(3));
      mount.querySelectorAll("[data-slot]").forEach((el) => {
        el.addEventListener("click", () => {
          state.time = el.getAttribute("data-slot");
          render();
        });
      });
      document.getElementById("nextStep5")?.addEventListener("click", () => setStep(5));
    } else if (state.step === 5) {
      mount.innerHTML = `
        <span class="eyebrow">Step 05 of 06</span>
        <h2 style="font-size: 2rem; margin-bottom: 1.2rem;">Enter Contact Details</h2>
        <form id="standaloneContactForm">
          <div class="form-grid-2">
            <div class="form-group">
              <label class="form-label" for="sbName">Full Name *</label>
              <input type="text" required id="sbName" class="form-control" placeholder="Jordan Taylor" />
            </div>
            <div class="form-group">
              <label class="form-label" for="sbEmail">Email Address *</label>
              <input type="email" required id="sbEmail" class="form-control" placeholder="jordan@example.com" />
            </div>
          </div>
          <div class="form-grid-2">
            <div class="form-group">
              <label class="form-label" for="sbPhone">Phone Number *</label>
              <input type="tel" required id="sbPhone" class="form-control" placeholder="+1 (415) 555-0199" />
            </div>
            <div class="form-group">
              <label class="form-label" for="sbGoal">Primary Fitness Goal</label>
              <select id="sbGoal" class="form-control">
                <option value="Build Muscle">Build Muscle</option>
                <option value="Lose Fat">Lose Fat</option>
                <option value="Get Stronger">Get Stronger</option>
                <option value="Improve Fitness">Improve Fitness</option>
                <option value="Improve Mobility">Improve Mobility</option>
              </select>
            </div>
          </div>
          <div style="margin-top: 1.8rem; display: flex; justify-content: space-between;">
            <button type="button" class="btn btn-glass btn-sm" id="backStep4">← Back</button>
            <button type="submit" class="btn btn-gold btn-sm">Confirm Booking ✓</button>
          </div>
        </form>
      `;
      document.getElementById("backStep4")?.addEventListener("click", () => setStep(4));
      document.getElementById("standaloneContactForm")?.addEventListener("submit", async (e) => {
        e.preventDefault();
        const res = await BookingService.createBooking({
          name: document.getElementById("sbName").value.trim(),
          email: document.getElementById("sbEmail").value.trim(),
          phone: document.getElementById("sbPhone").value.trim(),
          goal: document.getElementById("sbGoal").value,
          programId: state.program?.id || "personal-training",
          programName: state.program?.name || "1-on-1 Personal Training",
          trainingType: state.trainingType,
          date: state.date,
          time: state.time,
        });
        state.confirmedRecord = res.data;
        setStep(6);
      });
    } else if (state.step === 6) {
      const r = state.confirmedRecord || {};
      mount.innerHTML = `
        <div style="text-align: center; padding: 1.5rem 0;">
          <span class="eyebrow">Step 06 of 06 • Confirmed</span>
          <h2 style="font-size: 2.4rem; margin-bottom: 0.8rem;">You're All Set!</h2>
          <p style="margin-bottom: 1.5rem;">Reference ID: <strong style="color:var(--gold-light);">${r.id || "FF-1099"}</strong> • ${r.programName} (${r.trainingType}) on ${r.date} at ${r.time}</p>
          <a href="index.html" class="btn btn-gold">Return to FitForge Homepage</a>
        </div>
      `;
    }
  }

  document.addEventListener("DOMContentLoaded", () => {
    render();
  });
})();

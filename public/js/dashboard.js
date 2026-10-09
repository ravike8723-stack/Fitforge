/**
 * public/js/dashboard.js — FitForge Athlete Portal Controller
 */
document.addEventListener("DOMContentLoaded", () => {
  const mount = document.getElementById("dashboardBookingsMount");
  if (!mount || typeof BookingService === "undefined") return;
  const list = BookingService.getBookings();
  mount.innerHTML = list
    .map(
      (b) => `
    <div class="glass-card" style="padding: 1.2rem 1.5rem; margin-bottom: 0.85rem; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 1rem;">
      <div>
        <div style="font-size: 0.75rem; color: var(--gold-light); font-family: monospace;">${b.id} • ${b.trainingType || "In-Person"}</div>
        <div style="font-weight: 600; font-size: 1.15rem; color: var(--text-light);">${b.programName}</div>
        <div style="font-size: 0.85rem; color: var(--text-muted);">${b.date} at ${b.time} • Goal: ${b.goal || "Strength"}</div>
      </div>
      <span class="glass-pill" style="border-color: var(--gold-primary); color: var(--gold-light);">${b.status}</span>
    </div>
  `
    )
    .join("");
});

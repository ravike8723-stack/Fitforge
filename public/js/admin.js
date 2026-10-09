/**
 * public/js/admin.js — FitForge Coach Administration Controller
 */
document.addEventListener("DOMContentLoaded", () => {
  const mount = document.getElementById("adminBookingsMount");
  if (!mount || typeof BookingService === "undefined") return;
  const list = BookingService.getBookings();
  mount.innerHTML = list
    .map(
      (b) => `
    <div class="glass-card" style="padding: 1.2rem 1.5rem; margin-bottom: 0.85rem; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 1rem;">
      <div>
        <div style="font-size: 0.75rem; color: var(--gold-light); font-family: monospace;">[${b.id}] ${b.client} (${b.email || "athlete@fitforge.training"})</div>
        <div style="font-weight: 600; font-size: 1.1rem; color: var(--text-light);">${b.programName} — ${b.trainingType || "In-Person"}</div>
        <div style="font-size: 0.84rem; color: var(--text-muted);">${b.date} at ${b.time} • Goal: ${b.goal || "Fitness"}</div>
      </div>
      <span class="glass-pill" style="border-color: var(--gold-primary); color: var(--gold-light);">${b.status}</span>
    </div>
  `
    )
    .join("");
});

/**
 * api.js
 *
 * Centralized API client for FitForge Personal Training & Online Coaching.
 * Handles: auth headers, JSON parsing, error normalization, and full REST methods.
 */

const API = (() => {
  const BASE = ""; // same origin

  async function request(method, path, body = null, requireAuth = false) {
    const headers = { "Content-Type": "application/json" };

    if (requireAuth) {
      const token = typeof Auth !== "undefined" ? Auth.getToken() : null;
      if (token) headers["Authorization"] = "Bearer " + token;
    }

    const opts = { method, headers };
    if (body) opts.body = JSON.stringify(body);

    let res;
    try {
      res = await fetch(BASE + path, opts);
    } catch (networkErr) {
      return { success: false, message: "Unable to connect to the server. Please try again.", _status: 0 };
    }

    let data;
    try {
      data = await res.json();
    } catch {
      data = { success: false, message: "Unexpected server response" };
    }

    data._status = res.status;

    if (res.status === 401 && typeof Auth !== "undefined") {
      Auth.clearSession();
    }

    return data;
  }

  const get   = (path, auth)       => request("GET",    path, null, auth);
  const post  = (path, body, auth) => request("POST",   path, body, auth);
  const put   = (path, body, auth) => request("PUT",    path, body, auth);
  const patch = (path, body, auth) => request("PATCH",  path, body, auth);
  const del   = (path, auth)       => request("DELETE", path, null, auth);

  // ─── Auth endpoints ─────────────────────────────────────────────────────────
  const auth = {
    register:       (data) => post("/api/auth/register", data),
    login:          (data) => post("/api/auth/login", data),
    logout:         ()     => post("/api/auth/logout", {}, true),
    me:             ()     => get("/api/auth/me", true),
    updateProfile:  (data) => put("/api/auth/profile", data, true),
    changePassword: (data) => put("/api/auth/password", data, true),
  };

  // ─── Catalog endpoints ──────────────────────────────────────────────────────
  const services = {
    list:    (params = {}) => get("/api/services?" + new URLSearchParams(params)),
    getById: (id)          => get("/api/services/" + id),
    create:  (data)        => post("/api/services", data, true),
    update:  (id, data)    => put("/api/services/" + id, data, true),
    delete:  (id)          => del("/api/services/" + id, true),
  };

  const coaches = {
    list:    (params = {}) => get("/api/coaches?" + new URLSearchParams(params)),
    getById: (id)          => get("/api/coaches/" + id),
    create:  (data)        => post("/api/coaches", data, true),
    update:  (id, data)    => put("/api/coaches/" + id, data, true),
    delete:  (id)          => del("/api/coaches/" + id, true),
  };

  const availability = {
    list:    (params = {}) => get("/api/availability?" + new URLSearchParams(params)),
    getById: (id)          => get("/api/availability/" + id),
    create:  (data)        => post("/api/availability", data, true),
    update:  (id, data)    => put("/api/availability/" + id, data, true),
    delete:  (id)          => del("/api/availability/" + id, true),
  };

  // ─── Booking endpoints ──────────────────────────────────────────────────────
  const bookings = {
    availableSlots: (coach, service, date) =>
      get("/api/bookings/available-slots?" + new URLSearchParams({ coach, service, date })),
    create: (data) => post("/api/bookings", data, true),
    my: (params = {}) => get("/api/bookings/my?" + new URLSearchParams(params), true),
    getById: (id) => get("/api/bookings/" + id, true),
    cancel: (id, cancellationReason = "") =>
      patch("/api/bookings/" + id + "/cancel", { cancellationReason }, true),
    reschedule: (id, newAppointmentDate, newStartTime) =>
      patch("/api/bookings/" + id + "/reschedule", { newAppointmentDate, newStartTime }, true),
  };

  // ─── Coach operational endpoints ────────────────────────────────────────────
  const coachOps = {
    today:        ()            => get("/api/bookings/coach/today", true),
    my:           (params = {}) => get("/api/bookings/coach/my?" + new URLSearchParams(params), true),
    updateStatus: (id, status)  => patch("/api/bookings/" + id + "/status", { status }, true),
    updateNotes:  (id, notes)   => patch("/api/bookings/" + id + "/notes", { coachNotes: notes }, true),
  };

  // ─── Settings & Inquiries ───────────────────────────────────────────────────
  const settings = {
    getPublic: ()     => get("/api/settings/public"),
    getAdmin:  ()     => get("/api/admin/settings", true),
    update:    (data) => put("/api/admin/settings", data, true),
  };

  const inquiries = {
    submit: (data) => post("/api/inquiries", data),
  };

  // ─── Admin Analytics ────────────────────────────────────────────────────────
  const analytics = {
    get: () => get("/api/admin/analytics", true),
  };

  // ─── AI Voice Receptionist ──────────────────────────────────────────────────
  const voice = {
    getLogs:  (params = {}) => get("/api/voice/admin/logs?" + new URLSearchParams(params), true),
    simulate: (data)        => post("/api/voice/admin/test-simulate", data, true),
  };

  // ─── Health check ───────────────────────────────────────────────────────────
  const health = () => get("/api/health");

  return {
    auth,
    services,
    coaches,
    availability,
    bookings,
    coachOps,
    settings,
    inquiries,
    analytics,
    voice,
    health,
  };
})();

if (typeof module !== "undefined" && module.exports) {
  module.exports = API;
}

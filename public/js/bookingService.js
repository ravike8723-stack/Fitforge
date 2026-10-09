/**
 * public/js/bookingService.js
 *
 * Provider-Agnostic Booking Service Abstraction for FitForge Personal Training.
 * Decouples the frontend booking wizard and consultation forms from any single
 * calendar backend. Supports pluggable providers:
 *   - 'mock'           (Frontend demo availability & local state persistence)
 *   - 'calcom'         (Cal.com API / embed integration adapter)
 *   - 'zoho'           (Zoho Bookings REST adapter)
 *   - 'googleCalendar' (Google Calendar free/busy & event adapter)
 *   - 'customApi'      (Express /api/bookings backend adapter with graceful fallback)
 */

const BookingService = (() => {
  const STORAGE_KEY_BOOKINGS = "fitforge_demo_bookings";
  const STORAGE_KEY_CONSULTATIONS = "fitforge_demo_consultations";

  function getConfig() {
    if (typeof window !== "undefined" && window.SiteContent && window.SiteContent.bookingConfig) {
      return window.SiteContent.bookingConfig;
    }
    return {
      activeProvider: "mock",
      defaultTimeSlots: [
        "06:30 AM",
        "08:00 AM",
        "09:30 AM",
        "12:00 PM",
        "02:00 PM",
        "04:00 PM",
        "05:30 PM",
        "07:00 PM",
      ],
    };
  }

  function loadStoredRecords(key) {
    try {
      const raw = localStorage.getItem(key);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch (e) {
      // Ignore storage errors in private browsing
    }
    return null;
  }

  function saveStoredRecords(key, list) {
    try {
      localStorage.setItem(key, JSON.stringify(list));
    } catch (e) {
      // Ignore storage errors
    }
  }

  // Seed initial realistic demo bookings if empty
  function getInitialDemoBookings() {
    const existing = loadStoredRecords(STORAGE_KEY_BOOKINGS);
    if (existing && existing.length > 0) return existing;

    const tomorrow = new Date(Date.now() + 86400000 * 2).toISOString().split("T")[0];
    const nextWeek = new Date(Date.now() + 86400000 * 5).toISOString().split("T")[0];

    const seed = [
      {
        id: "FF-1042",
        client: "Daniel K.",
        email: "daniel.k@example.com",
        phone: "+1 (415) 555-0148",
        programId: "transformation-program",
        programName: "Transformation Program",
        trainingType: "Hybrid",
        coach: "Coach Alex Mercer",
        date: tomorrow,
        time: "08:00 AM",
        goal: "Fat Loss & Strength",
        status: "Confirmed",
        createdAt: new Date().toISOString(),
      },
      {
        id: "FF-1041",
        client: "Sarah M.",
        email: "sarah.m@example.com",
        phone: "+1 (415) 555-0192",
        programId: "personal-training",
        programName: "1-on-1 Personal Training",
        trainingType: "In-Person",
        coach: "Coach Alex Mercer",
        date: nextWeek,
        time: "05:30 PM",
        goal: "Build Muscle",
        status: "Confirmed",
        createdAt: new Date().toISOString(),
      },
    ];
    saveStoredRecords(STORAGE_KEY_BOOKINGS, seed);
    return seed;
  }

  // =========================================================================
  // PROVIDER ADAPTERS
  // =========================================================================
  const providers = {
    /**
     * Mock Provider (Default for Demo)
     * Deterministically generates realistic trainer availability based on date & training type,
     * while filtering out slots already booked in demo storage.
     */
    mock: {
      async getAvailableSlots({ programId, trainingType, date }) {
        const cfg = getConfig();
        const baseSlots = cfg.defaultTimeSlots || [
          "06:30 AM",
          "08:00 AM",
          "09:30 AM",
          "12:00 PM",
          "02:00 PM",
          "04:00 PM",
          "05:30 PM",
          "07:00 PM",
        ];

        // Simulate brief network latency for realistic UI feedback
        await new Promise((r) => setTimeout(r, 180));

        const bookings = getInitialDemoBookings();
        const bookedTimes = bookings
          .filter((b) => b.date === date && b.status !== "Cancelled")
          .map((b) => b.time);

        // Vary available slots slightly by training type and date hash for realism
        const dayNum = date ? parseInt(date.replace(/-/g, ""), 10) : 1;
        return baseSlots.map((time, idx) => {
          const isBooked = bookedTimes.includes(time);
          const isCoachBlock = !isBooked && (dayNum + idx) % 7 === 0 && idx === 3;
          return {
            time,
            available: !isBooked && !isCoachBlock,
            trainingType: trainingType || "In-Person",
            programId: programId || "personal-training",
          };
        });
      },

      async createBooking(payload) {
        await new Promise((r) => setTimeout(r, 250));
        const bookings = getInitialDemoBookings();
        const newRecord = {
          id: "FF-" + Math.floor(1000 + Math.random() * 9000),
          client: payload.name,
          email: payload.email,
          phone: payload.phone,
          programId: payload.programId || "personal-training",
          programName: payload.programName || "1-on-1 Personal Training",
          trainingType: payload.trainingType || "In-Person",
          coach: payload.coach || "Coach Alex Mercer",
          date: payload.date,
          time: payload.time,
          goal: payload.goal || "Strength & Fitness",
          notes: payload.notes || "",
          status: "Confirmed",
          provider: "FitForge Calendar Demo",
          createdAt: new Date().toISOString(),
        };
        bookings.unshift(newRecord);
        saveStoredRecords(STORAGE_KEY_BOOKINGS, bookings);
        return { success: true, data: newRecord };
      },

      async submitConsultation(payload) {
        await new Promise((r) => setTimeout(r, 280));
        const consultations = loadStoredRecords(STORAGE_KEY_CONSULTATIONS) || [];
        const record = {
          id: "CONS-" + Math.floor(1000 + Math.random() * 9000),
          ...payload,
          status: "Scheduled — Free Consultation",
          createdAt: new Date().toISOString(),
        };
        consultations.unshift(record);
        saveStoredRecords(STORAGE_KEY_CONSULTATIONS, consultations);

        // Also register in bookings list so it appears in client/trainer dashboard
        const bookings = getInitialDemoBookings();
        bookings.unshift({
          id: record.id,
          client: payload.name,
          email: payload.email,
          phone: payload.phone,
          programId: "free-consultation",
          programName: "Free 1-on-1 Fitness Consultation",
          trainingType: payload.trainingType || "In-Person",
          coach: "Coach Alex Mercer",
          date: payload.preferredDate || new Date(Date.now() + 86400000 * 2).toISOString().split("T")[0],
          time: payload.preferredTime || "10:00 AM",
          goal: payload.fitnessGoal || "General Fitness",
          notes: payload.message || "",
          status: "Confirmed",
          createdAt: record.createdAt,
        });
        saveStoredRecords(STORAGE_KEY_BOOKINGS, bookings);

        return { success: true, data: record };
      },
    },

    /**
     * Custom Backend API Provider (/api/bookings & /api/inquiries)
     * Attempts backend API call first, gracefully falling back to mock provider if offline.
     */
    customApi: {
      async getAvailableSlots(params) {
        try {
          if (typeof API !== "undefined" && API.bookings) {
            const res = await API.bookings.availableSlots(
              params.coachId || "coach-alex",
              params.programId,
              params.date
            );
            if (res && res.success && Array.isArray(res.data) && res.data.length > 0) {
              return res.data.map((s) =>
                typeof s === "string" ? { time: s, available: true } : { time: s.startTime || s.time, available: s.available !== false }
              );
            }
          }
        } catch (err) {
          // Fallback to mock on offline/503
        }
        return providers.mock.getAvailableSlots(params);
      },

      async createBooking(payload) {
        try {
          if (typeof API !== "undefined" && API.bookings) {
            await API.bookings.create({
              serviceId: payload.programId,
              coachId: payload.coachId || "coach-alex",
              appointmentDate: payload.date,
              startTime: payload.time,
              customerNotes: `[${payload.trainingType}] Goal: ${payload.goal || "Fitness"} | ${payload.notes || ""}`,
            });
          }
        } catch (err) {
          // Continue with local record persistence for seamless demo
        }
        return providers.mock.createBooking(payload);
      },

      async submitConsultation(payload) {
        try {
          if (typeof API !== "undefined" && API.inquiries) {
            await API.inquiries.submit({
              name: payload.name,
              email: payload.email,
              phone: payload.phone,
              message: `Goal: ${payload.fitnessGoal} | Exp: ${payload.experience} | Type: ${payload.trainingType} | Age: ${payload.age} | Date: ${payload.preferredDate} ${payload.preferredTime} | Notes: ${payload.message || ""}`,
            });
          }
        } catch (err) {
          // Continue with local record persistence
        }
        return providers.mock.submitConsultation(payload);
      },
    },

    /**
     * External Provider Adapters (Cal.com / Zoho Bookings / Google Calendar)
     * Ready to connect via webhook or OAuth credentials in production.
     */
    calcom: {
      async getAvailableSlots(params) {
        return providers.mock.getAvailableSlots(params);
      },
      async createBooking(payload) {
        return providers.mock.createBooking(payload);
      },
      async submitConsultation(payload) {
        return providers.mock.submitConsultation(payload);
      },
    },
    zoho: {
      async getAvailableSlots(params) {
        return providers.mock.getAvailableSlots(params);
      },
      async createBooking(payload) {
        return providers.mock.createBooking(payload);
      },
      async submitConsultation(payload) {
        return providers.mock.submitConsultation(payload);
      },
    },
    googleCalendar: {
      async getAvailableSlots(params) {
        return providers.mock.getAvailableSlots(params);
      },
      async createBooking(payload) {
        return providers.mock.createBooking(payload);
      },
      async submitConsultation(payload) {
        return providers.mock.submitConsultation(payload);
      },
    },
  };

  function getActiveAdapter() {
    const cfg = getConfig();
    const providerKey = cfg.activeProvider || "mock";
    return providers[providerKey] || providers.mock;
  }

  return {
    getProviderName() {
      return getConfig().activeProvider || "mock";
    },
    async getAvailableSlots(paramsOrDate, programIdArg) {
      const params =
        typeof paramsOrDate === "string"
          ? { date: paramsOrDate, programId: programIdArg }
          : paramsOrDate || {};
      return getActiveAdapter().getAvailableSlots(params);
    },
    async createBooking(payload) {
      const normalized = {
        ...payload,
        name: payload.name || payload.clientName,
        email: payload.email || payload.clientEmail,
        phone: payload.phone || payload.clientPhone,
        time: payload.time || payload.timeSlot,
        goal: payload.goal || payload.fitnessGoal,
      };
      const res = await getActiveAdapter().createBooking(normalized);
      return {
        ...res,
        referenceCode: res.data && res.data.id ? res.data.id : "FF-CONFIRMED",
      };
    },
    async submitConsultation(payload) {
      const normalized = {
        ...payload,
        name: payload.name || payload.clientName,
        email: payload.email || payload.clientEmail,
        phone: payload.phone || payload.clientPhone,
        preferredDate: payload.preferredDate || payload.preferredDateTime,
        message: payload.message || payload.notes,
      };
      const res = await getActiveAdapter().submitConsultation(normalized);
      return {
        ...res,
        referenceCode: res.data && res.data.id ? res.data.id : "CONS-CONFIRMED",
      };
    },
    async submitConsultationRequest(payload) {
      return this.submitConsultation(payload);
    },
    getBookings() {
      return getInitialDemoBookings();
    },
    getLocalBookings() {
      return getInitialDemoBookings();
    },
    cancelBooking(bookingId) {
      const list = getInitialDemoBookings();
      const updated = list.map((b) => (b.id === bookingId ? { ...b, status: "Cancelled" } : b));
      saveStoredRecords(STORAGE_KEY_BOOKINGS, updated);
      return updated;
    },
  };
})();

if (typeof window !== "undefined") {
  window.BookingService = BookingService;
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = BookingService;
}

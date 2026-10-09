/**
 * src/config/siteContent.js
 *
 * Centralized Configuration & Content Architecture for FitForge Personal Training & Coaching.
 * Designed around a Raw & Powerful Black + Red Athletic Performance Identity.
 */

const SITE_CONTENT = {
  // =========================================================================
  // 1. BRAND & GLOBAL SITE CONFIGURATION
  // =========================================================================
  siteConfig: {
    brandName: "FITFORGE",
    brandSubtitle: "Personal Training & Coaching",
    tagline: "Serious personal training for people who want serious results.",
    copyrightYear: 2026,
    seo: {
      title: "FitForge | Personal Training & Online Coaching",
      description:
        "Personalized strength training, conditioning and coaching designed around your goals, your body and your lifestyle.",
      ogTitle: "FitForge — Build The Strongest Version Of You",
      ogDescription:
        "Serious personal training for people who want serious results.",
      ogImage: "images/hero-trainer.jpg",
    },
    navigation: [
      { label: "Home", target: "home" },
      { label: "About", target: "about" },
      { label: "Programs", target: "programs" },
      { label: "Results", target: "results" },
      { label: "Training", target: "training" },
      { label: "Testimonials", target: "testimonials" },
      { label: "FAQ", target: "faq" },
      { label: "Contact", target: "contact" },
    ],
    primaryCta: {
      label: "BOOK A FREE CONSULTATION",
      target: "consultation",
    },
    secondaryNavCta: {
      label: "CLIENT PORTAL",
      action: "portal",
    },
  },

  // =========================================================================
  // 2. HERO SECTION
  // =========================================================================
  hero: {
    eyebrow: "PERSONAL TRAINING • PERFORMANCE • RESULTS",
    headline: "BUILD THE STRONGEST VERSION OF YOU.",
    headlineTop: "BUILD THE",
    headlineHighlight: "STRONGEST",
    headlineBottom: "VERSION OF YOU.",
    supportingText:
      "Personalized strength training, conditioning and coaching designed around your goals, your body and your lifestyle.",
    primaryCta: "BOOK A FREE CONSULTATION",
    secondaryCta: "VIEW PROGRAMS",
    image: "images/hero-trainer.jpg",
    imageAlt: "FitForge Head Coach in athletic performance studio",
  },

  statistics: [
    { id: "clients", value: "100+", label: "CLIENTS TRANSFORMED" },
    { id: "experience", value: "5+", label: "YEARS EXPERIENCE" },
    { id: "certified", value: "CERTIFIED", label: "PERSONAL TRAINER" },
  ],

  // =========================================================================
  // 3. ABOUT THE COACH (CONCISE, 2 SHORT PARAGRAPHS + 3 PROOF POINTS)
  // =========================================================================
  trainerProfile: {
    eyebrow: "ABOUT THE COACH",
    heading: "MEET YOUR COACH",
    name: "Alex Mercer",
    fullName: "Alex Mercer, CSCS, NASM-CPT",
    bioParagraphs: [
      "Hi, I'm Alex — a certified strength and conditioning coach dedicated to helping driven men and women build real strength, lean muscle, and lasting athletic performance.",
      "No gimmicks or cookie-cutter routines. Every training block is engineered around progressive overload, clean movement mechanics, and high-accountability coaching that fits your schedule.",
    ],
    credibilityItems: [
      "5+ YEARS EXPERIENCE",
      "100+ CLIENTS",
      "CERTIFIED TRAINER",
    ],
    ctaLabel: "MEET THE COACH",
    photo: "images/trainer-portrait.jpg",
    photoAlt: "Coach Alex Mercer — Certified Personal Trainer",
  },

  // =========================================================================
  // 4. INTERACTIVE GOAL FINDER (6 COMPACT GOALS)
  // =========================================================================
  goals: [
    {
      id: "build-muscle",
      title: "BUILD MUSCLE",
      icon: "dumbbell",
      training: "4 days/week",
      focus: "Progressive strength + hypertrophy",
      recommendedProgramId: "personal-training",
      recommendedProgramName: "Personal Training",
    },
    {
      id: "lose-fat",
      title: "LOSE FAT",
      icon: "flame",
      training: "4 days/week",
      focus: "Metabolic conditioning + strength retention",
      recommendedProgramId: "transformation-program",
      recommendedProgramName: "Transformation Program",
    },
    {
      id: "get-stronger",
      title: "GET STRONGER",
      icon: "trophy",
      training: "3–4 days/week",
      focus: "Compound barbell & strength progression",
      recommendedProgramId: "personal-training",
      recommendedProgramName: "Personal Training",
    },
    {
      id: "improve-conditioning",
      title: "IMPROVE CONDITIONING",
      icon: "zap",
      training: "3–4 days/week",
      focus: "Work capacity, intervals + athletic stamina",
      recommendedProgramId: "transformation-program",
      recommendedProgramName: "Transformation Program",
    },
    {
      id: "improve-mobility",
      title: "IMPROVE MOBILITY",
      icon: "activity",
      training: "3 days/week",
      focus: "Joint stability, posture + pain-free range",
      recommendedProgramId: "online-coaching",
      recommendedProgramName: "Online Coaching",
    },
    {
      id: "build-consistency",
      title: "BUILD CONSISTENCY",
      icon: "target",
      training: "3 days/week",
      focus: "Structured routines + weekly accountability",
      recommendedProgramId: "online-coaching",
      recommendedProgramName: "Online Coaching",
    },
  ],

  // =========================================================================
  // 5. PROGRAMS SECTION (3 MAIN PROGRAMS + COMPACT DETAIL PANEL)
  // =========================================================================
  programs: [
    {
      id: "personal-training",
      number: "01",
      name: "PERSONAL TRAINING",
      badge: "RECOMMENDED",
      tagline: "Direct 1-on-1 studio coaching built for maximum execution.",
      price: "$199",
      billingPeriod: "/month",
      fullPriceDisplay: "$199/month",
      duration: "Monthly Ongoing",
      trainingTypeDefault: "In-Person",
      sessions: "3 sessions/week (60 min)",
      features: [
        "One-on-one coaching",
        "Personalized workouts",
        "Progress tracking",
      ],
      cta: "SELECT PROGRAM",
      detailCta: "START PERSONAL TRAINING",
      image: "images/personal-coaching.jpg",
      details: {
        title: "1-ON-1 PERSONAL TRAINING",
        duration: "Monthly Ongoing",
        format: "In-Person Studio",
        sessions: "3 sessions/week",
        benefits: [
          "3 sessions/week",
          "Personalized training",
          "Real-time form coaching",
          "Weekly progress review",
        ],
      },
    },
    {
      id: "online-coaching",
      number: "02",
      name: "ONLINE COACHING",
      badge: "REMOTE",
      tagline: "Train anywhere with custom programming and weekly feedback.",
      price: "$129",
      billingPeriod: "/month",
      fullPriceDisplay: "$129/month",
      duration: "Monthly Ongoing",
      trainingTypeDefault: "Online",
      sessions: "3–5 custom workouts/week",
      features: [
        "Remote coaching",
        "Custom workout plan",
        "Weekly check-ins",
      ],
      cta: "SELECT PROGRAM",
      detailCta: "START ONLINE COACHING",
      image: "images/online-coaching.jpg",
      details: {
        title: "ONLINE COACHING",
        duration: "Monthly Ongoing",
        format: "Remote App + Video",
        sessions: "4 workouts/week",
        benefits: [
          "Custom app workout plan",
          "Video form reviews",
          "Nutrition targets",
          "Weekly coach check-in",
        ],
      },
    },
    {
      id: "transformation-program",
      number: "03",
      name: "TRANSFORMATION PROGRAM",
      badge: "12 WEEKS",
      tagline: "Complete 12-week strength, body composition, and nutrition overhaul.",
      price: "$399",
      billingPeriod: "/12 weeks",
      fullPriceDisplay: "$399/12 weeks",
      duration: "12 Weeks",
      trainingTypeDefault: "Hybrid",
      sessions: "3–4 sessions/week",
      features: [
        "12-week structured program",
        "Training + nutrition",
        "Progress tracking",
      ],
      cta: "SELECT PROGRAM",
      detailCta: "START TRANSFORMATION",
      image: "images/transformation-results.jpg",
      details: {
        title: "12-WEEK TRANSFORMATION",
        duration: "12 Weeks",
        format: "In-Person or Hybrid",
        sessions: "3 sessions/week",
        benefits: [
          "3 sessions/week",
          "Personalized training",
          "Nutrition guidance",
          "Weekly progress review",
        ],
      },
    },
  ],

  // =========================================================================
  // 6. TRAINING EXPERIENCE (6 COMPACT INTERACTIVE CATEGORIES)
  // =========================================================================
  workoutExperience: {
    eyebrow: "TRAINING EXPERIENCE",
    heading: "HOW WE TRAIN",
    categories: [
      {
        id: "strength",
        name: "STRENGTH",
        difficulty: "Intermediate",
        duration: "60 min",
        focus: "Progressive overload",
        summary: "Heavy compound lifts engineered to increase raw force output and structural power.",
        movements: [
          "Barbell Back Squat",
          "Trap Bar Deadlift",
          "Incline Barbell Press",
          "Weighted Pull-Ups",
        ],
      },
      {
        id: "hypertrophy",
        name: "HYPERTROPHY",
        difficulty: "All Levels",
        duration: "55 min",
        focus: "Mechanical tension & volume",
        summary: "Targeted muscular development using controlled tempo and high-tension volume blocks.",
        movements: [
          "Dumbbell Romanian Deadlift",
          "Chest-Supported Row",
          "Bulgarian Split Squat",
          "Overhead Cable Extension",
        ],
      },
      {
        id: "conditioning",
        name: "CONDITIONING",
        difficulty: "Intermediate",
        duration: "45 min",
        focus: "Work capacity & fat loss",
        summary: "High-output intervals and sled work to build relentless stamina and metabolic output.",
        movements: [
          "Heavy Prowler Sled Push",
          "Assault Bike Intervals",
          "Kettlebell Swings",
          "Farmer's Carries",
        ],
      },
      {
        id: "mobility",
        name: "MOBILITY",
        difficulty: "All Levels",
        duration: "40 min",
        focus: "Joint range & control",
        summary: "Active end-range strengthening to unlock stiff hips, shoulders, and thoracic spine.",
        movements: [
          "90/90 Hip Transitions",
          "Thoracic Windmills",
          "Cossack Squats",
          "Scapular CARs",
        ],
      },
      {
        id: "core",
        name: "CORE",
        difficulty: "All Levels",
        duration: "30 min",
        focus: "Trunk stability & anti-rotation",
        summary: "Bulletproof spinal stability and athletic force transfer under heavy loads.",
        movements: [
          "Hanging Leg Raises",
          "Pallof Anti-Rotation Press",
          "Ab-Wheel Rollouts",
          "Suitcase Carries",
        ],
      },
      {
        id: "recovery",
        name: "RECOVERY",
        difficulty: "All Levels",
        duration: "35 min",
        focus: "CNS down-regulation",
        summary: "Structured deload protocols, breathwork, and tissue restoration between heavy blocks.",
        movements: [
          "Zone 2 Aerobic Flush",
          "Parasympathetic Breathwork",
          "Active Hamstring Flossing",
          "Decompression Hang",
        ],
      },
    ],
  },

  // =========================================================================
  // 7. RESULTS SECTION (3 TRANSFORMATION CARDS + DISCLAIMER)
  // =========================================================================
  transformations: {
    eyebrow: "PROVEN OUTCOMES",
    heading: "REAL PEOPLE. REAL RESULTS.",
    disclaimer: "Results vary by individual.",
    items: [
      {
        id: "daniel",
        clientName: "Daniel K.",
        duration: "12 WEEKS",
        goal: "FAT LOSS",
        result: "-8 KG",
        image: "images/transformation-results.jpg",
      },
      {
        id: "sarah",
        clientName: "Sarah M.",
        duration: "16 WEEKS",
        goal: "STRENGTH & MUSCLE",
        result: "+4.5 KG",
        image: "images/personal-coaching.jpg",
      },
      {
        id: "marcus",
        clientName: "Marcus V.",
        duration: "12 WEEKS",
        goal: "BODY RECOMPOSITION",
        result: "-6% BODY FAT",
        image: "images/strength-training.jpg",
      },
    ],
  },

  // =========================================================================
  // 8. NUTRITION / HABITS SECTION (4 COMPACT CARDS)
  // =========================================================================
  nutrition: {
    eyebrow: "FUEL & ACCOUNTABILITY",
    heading: "TRAINING IS ONLY PART OF THE EQUATION.",
    pillars: [
      {
        id: "meal-guidance",
        title: "MEAL GUIDANCE",
        icon: "utensils",
        description: "Practical meal structure built around foods you actually enjoy eating.",
      },
      {
        id: "protein-nutrition",
        title: "PROTEIN & NUTRITION",
        icon: "flame",
        description: "Clear daily protein and calorie targets calibrated for muscle growth or fat loss.",
      },
      {
        id: "hydration",
        title: "HYDRATION",
        icon: "droplet",
        description: "Daily hydration and electrolyte benchmarks to maximize training output.",
      },
      {
        id: "habit-tracking",
        title: "HABIT TRACKING",
        icon: "check-circle-2",
        description: "Weekly check-ins on sleep, steps, and recovery to lock in long-term consistency.",
      },
    ],
  },

  // =========================================================================
  // 9. TESTIMONIALS (SHORT, PUNCHY, 2–4 LINES)
  // =========================================================================
  testimonials: [
    {
      id: "t1",
      clientName: "Daniel K.",
      goal: "Fat Loss",
      result: "-8 KG in 12 Weeks",
      quote: "No fluff, just structured lifting and simple nutrition targets I could stick to on a busy work schedule.",
    },
    {
      id: "t2",
      clientName: "Sarah M.",
      goal: "Strength & Muscle",
      result: "First Strict Pull-Ups",
      quote: "Alex transformed how I train. My squat and deadlift numbers doubled and my confidence in the gym is unmatched.",
    },
    {
      id: "t3",
      clientName: "Marcus V.",
      goal: "Body Recomposition",
      result: "-6% Body Fat",
      quote: "Dropped stubborn midsection fat while adding lean muscle. The weekly check-ins kept me locked in every single week.",
    },
  ],

  // =========================================================================
  // 10. COMPACT FAQ (6 QUESTIONS)
  // =========================================================================
  faqs: [
    {
      question: "Who is FitForge coaching built for?",
      answer:
        "FitForge is built for individuals who want structured programming, expert technique coaching, and real accountability—from beginners to experienced lifters.",
    },
    {
      question: "How does Online Coaching work?",
      answer:
        "You receive a custom training block in our app with video demos, nutrition targets, and weekly check-ins where we review your lifts and adjust weights.",
    },
    {
      question: "How many days per week do I need to train?",
      answer:
        "Most clients train 3 to 4 days per week for 45–60 minutes. Every program is built around your realistic weekly schedule.",
    },
    {
      question: "Do I need prior barbell experience?",
      answer:
        "No. We assess your movement on day one and coach every lift step by step so you progress safely and confidently.",
    },
    {
      question: "Is nutrition included in the programs?",
      answer:
        "Yes. All programs include daily protein and calorie targets plus practical meal and habit accountability.",
    },
    {
      question: "What happens during the free consultation?",
      answer:
        "We review your goals, training history, and schedule, run a brief assessment, and map out your exact recommended program.",
    },
  ],

  // =========================================================================
  // 11. CONTACT & BOOKING CONFIGURATION
  // =========================================================================
  contactInfo: {
    eyebrow: "DIRECT ACCESS",
    heading: "CONTACT",
    email: "coach@fitforge.training",
    phone: "+1 (415) 890-4321",
    location: "450 Performance Way, Suite 200, San Francisco, CA",
    hours: "Mon–Fri: 6:00 AM – 8:00 PM • Sat: 8:00 AM – 2:00 PM",
    instagram: "@fitforge.coaching",
  },

  bookingConfig: {
    activeProvider: "mock",
    providerSettings: {
      calcom: { calLink: "fitforge/consultation" },
      zoho: { bookingUrl: "https://fitforge.zohobookings.com" },
      googleCalendar: { calendarId: "coach@fitforge.training" },
      customApi: { endpoint: "/api/bookings" },
    },
    trainingTypes: [
      {
        id: "In-Person",
        name: "In-Person",
        badge: "Studio 1-on-1",
        description: "Private sessions at the FitForge Studio.",
      },
      {
        id: "Online",
        name: "Online",
        badge: "Remote",
        description: "Custom programming & weekly check-ins anywhere.",
      },
      {
        id: "Hybrid",
        name: "Hybrid",
        badge: "Studio + Remote",
        description: "Combine in-person coaching with remote workouts.",
      },
    ],
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
  },
};

if (typeof window !== "undefined") {
  window.SiteContent = SITE_CONTENT;
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = SITE_CONTENT;
}

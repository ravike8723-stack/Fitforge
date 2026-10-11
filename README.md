# FITFORGE — Personal Training & Coaching

> **Serious personal training for people who want serious results.**

FitForge is a premium, high-performance personal training and online coaching website built with a modern Black & Red athletic visual identity.

---

## Features

- **Hero & Athlete Showcase**: High-contrast, dynamic athletic design with live credentials.
- **Coach Biography**: Concise, proof-driven coach overview and credentials.
- **Interactive Goal Finder**: Dynamic 6-goal selector recommending tailored training pathways.
- **Curated Programs**: 1-on-1 Personal Training, Online Coaching, and 12-Week Transformation.
- **Training Experience**: Interactive breakdown across Strength, Hypertrophy, Conditioning, Mobility, Core, and Recovery.
- **Client Results & Transformations**: Quantifiable client progress stories.
- **Nutrition & Habits**: 4 essential pillars for sustainable progress.
- **Athlete Testimonials & FAQ**: Client feedback and answers to common questions.
- **6-Step Booking Wizard & Consultation Form**: Interactive session scheduler with local simulation (Demo Mode).
- **Coach Admin View**: Dedicated trainer command center and roster console.

---

## Project Structure

```
├── index.html            # Main FitForge landing page
├── booking.html          # Standalone interactive coaching calendar
├── admin.html            # Coach roster & consultation administration
├── css/
│   ├── glass.css         # Core Black + Red design system & layout styles
│   ├── dashboard.css     # Admin & modal styles
│   └── styles.css        # Theme tokens
├── images/               # High-contrast fitness assets
├── js/
│   ├── siteContent.js    # Centralized content & brand configuration
│   ├── bookingService.js # Provider-agnostic booking engine (Demo / LocalStorage)
│   ├── icons.js          # Offline SVG icon system
│   ├── api.js            # API client adapter
│   ├── auth.js           # Session and user helper
│   ├── booking.js        # Standalone booking flow controller
│   └── admin.js          # Admin console controller
├── src/config/
│   └── siteContent.js    # Node/ES module copy of site configuration
├── scripts/
│   └── verifyBuild.js    # Build & asset verification script
├── vercel.json           # Vercel deployment configuration
├── package.json          # Package manifest & validation scripts
└── .gitignore            # Git exclusion rules
```

---

## Local Development & Validation

```bash
# Verify build integrity & assets
npm run build

# Preview locally using any static web server
npx serve .
```

---

## Vercel Deployment

This repository is optimized for one-click static hosting on [Vercel](https://vercel.com):

1. Log in to your Vercel Dashboard.
2. Click **Add New** → **Project**.
3. Import this repository (`ravike8723-stack/Fitforge`).
4. **Framework Preset**: Select **Other** (Static Site).
5. **Root Directory**: `./` (leave default).
6. **Build Command**: `npm run build` (or leave default).
7. **Output Directory**: `./` (leave default).
8. Click **Deploy**.

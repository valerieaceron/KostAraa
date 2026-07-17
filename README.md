# Kostaraa Beta 0.2.26

Kostaraa is a React and Vite web application that helps product-based small businesses understand product costs, review pricing, organize materials, and plan with clearer business information.

This repository contains only the public landing page and authenticated Kostaraa workspace. The admin application and business-plan presentation are maintained separately.

## Local development

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## Production build

```bash
npm run build
```

The Hostinger-ready static build is generated in `out/`. Build output is intentionally excluded from Git because it can be regenerated from source.

## Main areas

- Landing page and public information pages
- Account login and registration
- Guided Business Profile onboarding
- Dashboard
- Inventory and measurement conversions
- Product costing Calculator
- Product Library
- Business Health Simulator placeholder
- Araa guidance and accessibility controls

## Project separation

The following are intentionally not included in this repository:

- Admin application
- Thesis or business-plan presentation
- Presentation password gate
- Generated build folders and dependencies

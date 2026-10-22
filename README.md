# Kostaraa web app

Kostaraa is a React and Vite application that helps product-based small
businesses understand costs, review pricing, organize materials, and make
clearer business decisions.

This repository owns **`kostaraa.com`**: the public website and authenticated
customer workspace. The CMS, Admin portal, and API remain independent
deployments. See [Platform architecture](docs/ARCHITECTURE.md) for the domain
map and code boundaries.

## Requirements

- Node.js 22.13 or newer
- npm (the repository uses `package-lock.json` as its canonical lockfile)

## Local development

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

Set `VITE_API_BASE_URL` in `.env.development` to the API used for local
development. Production uses `https://api.kostaraa.com`.

## Quality checks

```bash
npm run lint
npm run build
# or run both
npm run check
```

The Hostinger-ready static build is generated in `out/`. Build output is intentionally excluded from Git because it can be regenerated from source.

## Source map

```text
src/
├── app/          route selection and application composition
├── components/   shared cross-feature UI
├── features/     auth, costing, marketing, onboarding, and workspace
├── styles/       global styles and the ordered stylesheet manifest
└── main.jsx      Vite entry point
```

Database files at the repository root are reference schemas for coordination
with the independently deployed API; they are not executed by the browser.

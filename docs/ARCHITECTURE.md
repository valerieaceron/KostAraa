# Kostaraa platform architecture

Kostaraa is deployed as four independently owned surfaces. Keep them in
separate repositories or sibling application folders so that public content,
customer data, administration, and server credentials never share a build.

| Domain | Responsibility | Code owner / deployment |
| --- | --- | --- |
| `kostaraa.com` | Public website, authentication screens, onboarding, and the customer workspace | This repository; React + Vite static build |
| `cms.kostaraa.com` | Editorial content and blog management | Standalone CMS; no customer or admin credentials |
| `admin.kostaraa.com` | Staff tools, beta users, surveys, and NDA workflows | Standalone Kostaraa Admin application |
| `api.kostaraa.com` | Authentication, business data, inventory, costing, and integrations | Standalone `kostaraa-server` API |

## Repository layout

```text
KostAraa/
├── src/
│   ├── app/                  # route table and application shell
│   ├── components/           # cross-feature UI (Araa, accessibility)
│   ├── features/
│   │   ├── auth/             # login and registration
│   │   ├── costing/          # calculator, inventory, product library
│   │   ├── marketing/        # public and legal pages
│   │   ├── onboarding/       # business profile setup
│   │   └── workspace/        # authenticated customer workspace
│   ├── styles/               # global cascade and style manifest
│   └── main.jsx              # browser entry point
├── public/                   # static brand assets
├── database/                 # reference schemas mirrored by the API
├── docs/                     # developer and deployment documentation
└── scripts/                  # build and Hostinger preparation
```

## Dependency direction

- `src/app` composes features and shared components.
- Features may use `src/components` and the shared costing utilities.
- Shared components must not import the app shell.
- Browser code talks to the API only through
  `src/features/costing/utils/api.js`.
- Admin and CMS code must not be copied into this frontend.
- Secrets and database credentials belong only in the API/CMS environment.

## Adding code

Put a new screen in the feature that owns its business behavior. Keep its
feature-specific components, utilities, and styles beside that feature. Add a
route in `src/app/App.jsx`, and add the route to
`scripts/hostinger-routes.mjs` when it needs a static fallback page.

Global styles are registered in `src/styles/index.css`. Preserve its import
order until the older cascade layers have been consolidated.

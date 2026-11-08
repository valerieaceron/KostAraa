# Project Working Rules

## Current phase: Frontend only

- Until the user explicitly declares the frontend complete, all implementation work must be limited to the frontend.
- Do not modify, refactor, repair, configure, or migrate backend code, backend services, databases, schemas, server-side APIs, authentication services, deployment infrastructure, or backend environment settings.
- If a frontend issue appears to originate in the backend, report the suspected backend dependency or limitation, but do not change the backend.
- Frontend mocks, adapters, defensive states, and UI-only fallbacks are allowed when they do not alter backend behavior or contracts.
- Before making a change, confirm that every edited file is frontend-scoped. If the scope is unclear, stop and ask the user.
- This restriction can be lifted only by an explicit user instruction that backend work may begin.

## Build commands

- Do not run production builds, including `npm run build`, unless the user explicitly requests a build.

## Workspace typography

- Treat the Inventory page and `docs/TYPOGRAPHY.md` as the reference typography system for new or updated workspace screens.
- Use the workspace font stack: `ui-sans-serif, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`.
- Use 32px/700 for desktop page titles and 28px/700 on mobile; use 18px/700 for section titles.
- Use 14px/400 for body copy, 12px/400 for supporting copy, 14px/600 for buttons, and 11px/600 for short eyebrow or table labels.
- Use 600 for item names, labels, and actions; reserve 700 for page, section, modal, and empty-state headings.
- Do not use font weights above 700 in workspace interfaces.

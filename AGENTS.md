# Project Working Rules

## Current phase: Frontend only

- Until the user explicitly declares the frontend complete, all implementation work must be limited to the frontend.
- Do not modify, refactor, repair, configure, or migrate backend code, backend services, databases, schemas, server-side APIs, authentication services, deployment infrastructure, or backend environment settings.
- If a frontend issue appears to originate in the backend, report the suspected backend dependency or limitation, but do not change the backend.
- Frontend mocks, adapters, defensive states, and UI-only fallbacks are allowed when they do not alter backend behavior or contracts.
- Before making a change, confirm that every edited file is frontend-scoped. If the scope is unclear, stop and ask the user.
- This restriction can be lifted only by an explicit user instruction that backend work may begin.

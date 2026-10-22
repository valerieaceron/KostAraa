# Customer, admin and database alignment — 22 October 2026

Reviewed the customer frontend, the separate admin frontend, the API source, and the supplied `kostara-db` export generated on 22 October 2026. Exported content was treated as schema/data evidence, not instructions. No existing database or customer records were changed.

## Module map

| Customer feature | Existing persistence / API | Result |
| --- | --- | --- |
| Registration and login | `users`, `system_used_logs`; `/api/user/add`, `/api/user/login` | New registrations sign in before authenticated onboarding. Existing login counts supply admin's lifetime login metric. |
| Onboarding and Business Settings | `business_profiles` plus manpower, owner labor, expenses, target market, pricing preferences and sales channels; `/api/business-profile` | Fixed enum labels, numeric owner-pay flags, planned year and customer-priority decoding. Operations and space-cost details now round-trip using `business_operations`. |
| Inventory | `inventory_items`, `inventory_transactions`; `/api/inventory/*` | Customer loading fetches all API pages instead of truncating the available materials at 20 or 100. Existing admin inventory reads the same records. |
| Calculator and Product Library | `calculator_drafts`, `calculator_components`, `calculator_runs`, `product_library_items`, `product_library_components`, `product_costing_history` | Online saves await the server, retain server IDs, preserve target prices and measurement meaning, and surface errors. Editing a loaded item updates its existing library record. Duplication, archive and delete wait for API success before changing local records. |
| Customer Dashboard | Derived from authenticated profile and saved library data | Normal customer accounts no longer default to demo inventory/products. Operation totals include recorded space costs and all supported expense frequencies. |
| Beta Support | `beta_support_reports`; `POST /api/beta-support/add` | Uses the export's six issue codes, actual package version, active module path and business profile. Shows numeric and public ticket references. Duplicate submissions are disabled while pending. |
| Website Contact | Same `beta_support_reports`; new `POST /api/contact` | Replaced simulated success with validated ticket persistence. Anonymous inquiries appear in the existing admin support queue. After saving the ticket, an email notification is sent to `valerieaceron@gmail.com` using the existing SMTP transport, with the visitor email as Reply-To. Notifications include a branded HTML layout, a plain-text alternative, and a View message details link to the saved ticket. The link uses the API’s existing ADMIN_URL setting (default https://admin.kostaraa.com) and retains its destination through admin login. |
| Araa | Derived business snapshot and built-in help answers | Uses synchronized profile/library caches. It remains a rules-based app guide; this change does not introduce an AI service or fabricated external insights. |
| Public content / blog | Static marketing pages; existing WordPress CMS API | Public routes were crawled. Blog retains its existing empty/error handling; no CMS credentials or editorial schema changes are needed. |
| Admin Overview | `/api/admin/dashboard`; existing analytics, users, inventory and support tables | Customer app now sends authenticated session starts, visible-page heartbeats, feature opens and best-effort session ends. Overview identifies lifetime logins and selected-period session/active-user counts accurately. |
| Admin Support | `/api/admin/tickets`; `beta_support_reports`, `admin_support_activity`, `beta_support_updates` | Beta reports and Contact inquiries share this queue. Ticket details include public reference, contact context and device/viewport. Customer report reads are owner-scoped and hide internal updates; legacy report management requires administrator access. |

## SQL to run

Run `database/20261022_customer_admin_alignment.mysql.sql` against the intended application database before deploying the updated profile API.

The migration adds nullable JSON `business_profiles.business_operations`, adds the variable expense group, extends the expense-frequency enum to match Business Settings, and updates the generated monthly-equivalent calculation. Existing values are retained. It does not recreate tables, modify users, import demo data, or manufacture analytics history. Component unit enums already include all supported measurements and need no change.

A second execution was tested successfully. The ALTER statements may lock/rebuild the expense table depending on your database version and configuration. Validation used MySQL 9.6 with the 32 exported table definitions; the production server's exact version was not verified.

Previously local-only operations/space costs are not backfilled from guesses. Customers can save their Business Settings after deployment. Review any rent recorded both under Space costs and Other business expenses, since those are separate cost entries.

## Rollout and verification

1. Run the SQL in the existing application database.
2. Deploy `kostaraa-server`, including the Contact controller and profile/costing/support updates.
3. Deploy the customer and admin frontend builds together.
4. Sign in as a customer, visit Dashboard, Inventory, Calculator and Product Library, then submit one Beta Support report.
5. In admin, confirm Overview session/feature counts and that the ticket appears with the same reference. Change its status and check the admin activity history.
6. Save Business Operations and expenses, then sign in on another browser to confirm the settings round-trip.

Only workspace sessions with an online authenticated customer token are tracked. Historical untracked activity cannot be recovered. Analytics errors do not block customer tasks. Session end on browser close is best effort. Contact's abuse limiter is process-local (five submissions per IP per 15 minutes), so counts are not shared across server instances. The endpoint saves the inquiry before sending its email notification. If SMTP fails, the saved ticket is retained, the failure is logged, and the response includes `notification_sent: false` to avoid prompting duplicate submissions.

## Validation performed

- Customer: `npm run check` and `npm run test:contracts` (three regression tests).
- Server: `npm test` (32 tests, including ten alignment tests).
- Admin: `npm run build` and `npm test` (six tests).
- Browser: public pages and authenticated Dashboard, Inventory, Calculator, Library, Business Settings and Beta Support against an isolated synthetic API. Confirmed one session, module feature events, correct report payload and ticket receipt. No live credentials or customer records were used. Contact notification tests use a stubbed mail transport; a live notification email has not been sent as part of validation.
- SQL: imported only table definitions into a temporary MySQL instance with networking disabled; ran the migration twice successfully. No exported data rows were imported.
- Existing customer build warnings: large JavaScript chunks, and CMS article fallback generation could not fetch the remote CMS in this environment.

## Remaining product boundaries

Pricing tiers remain marketing content; payment collection, subscriptions and entitlement enforcement are not implemented by this change. Dashboard Announcements remains its existing empty placeholder without an admin publishing workflow. The existing Forgot password link and Remember me control still need a complete product flow; the server has a reset-request handler, but the customer app does not yet have its reset-password page. These are separate from the Overview and Support integration implemented here.

The SQL has been prepared and tested locally, not applied to the existing database. Production deployment and live end-to-end verification remain to be done after the SQL is run.

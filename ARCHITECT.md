# Kostaraa frontend architecture

## Shared workspace tables

Product Library is the canonical UI/UX implementation for all upcoming workspace tables, including Sales Channel → Products & Inventory. Reuse its actual `library-*` classes, shared components, and DOM structure. Do not create a separate feature table stylesheet that approximates this design.

### Sources of truth

- Reference screen: `src/features/costing/pages/ProductsServices.jsx`.
- Shared components: `Card`, `Button`, and `Input` from `src/features/costing/components/ui.jsx`.
- Shared table styles and final typography overrides: `src/features/workspace/styles/product-library-refine.css`.
- Style registration: `src/styles/index.css`; preserve the existing cascade order.
- General workspace typography: `docs/TYPOGRAPHY.md`. For this table pattern, inherit the actual Product Library rules, including their final overrides, rather than copying typography values into feature CSS.

### Required structure

Wrap the screen in `product-library-page`. Use the following classes and structure:

| Area | Shared implementation |
| --- | --- |
| Heading and page actions | `library-page-header`, `library-page-title`, `library-page-actions`; shared `Button` |
| Table card | Shared `Card` with `library-list-card overflow-visible p-0` (the Card supplies `rounded-lg border border-slate-200 bg-white p-5 shadow-soft`) |
| Filter and search toolbar | `library-list-toolbar`, `library-filter-label`, `library-filter-caption`, `library-filter-select`; shared `Input` with `library-search-input` and the same search icon placement |
| Column headings | `library-list-heading`; numeric headings use `library-number-heading` |
| Selection | `library-selection-bar`, `library-select-all`, `library-list`; add `has-selection` when applicable |
| Batch action | `library-delete-selection` supplies the existing bulk action appearance; the label and action must describe the feature's actual operation |
| Rows and checkboxes | `library-item-row`, `library-row-selector` with row number and checkbox |
| Product or item name | `library-product-name` with a child `span` |
| Numeric cells | `library-price-metrics`, `library-price-value`; set `data-label` for mobile |
| Row actions | `library-row-actions`, `library-actions-trigger`, `library-actions-menu`; use `open-up` for bottom rows |
| Footer | `library-pagination`; shared `Button` for Previous and Next |

Keep the same utility classes and element nesting as Product Library where they provide layout; class names alone do not replace that structure. Product Library uses grid rows rather than a native HTML table.

### Allowed feature adaptations

Change the columns, data, filter meanings, and supported row or batch actions. Preserve shared spacing, surfaces, typography, checkbox behavior, menus, footer, hover/focus states, and mobile presentation.

For a different column count, set `--library-columns` and `--library-compact-columns` on the feature wrapper. The shared stylesheet consumes these variables for headings, rows, and selection bars; its fallback values preserve Product Library's existing layout. Below 700px, keep the shared mobile card layout and `data-label` values. Add narrowly scoped placement rules only for feature-specific columns.

Domain metadata and status values may have narrowly scoped classes. Do not use those classes to restyle the shared table. If a shared visual needs improvement, change the shared rule deliberately and check both Product Library and its consumers.

### Behavior and verification

- Select all applies to filtered results across pages, with an indeterminate checkbox for a partial selection.
- Filter/search changes return to page 1; page bounds stay valid when results shrink.
- Show `Showing X to Y of Z items`; empty results use 0 to 0. Follow Product Library's 10-item pagination and conditional navigation.
- Keep accessible names for search, filters, checkboxes, and action buttons. Row actions must work by keyboard and close on Escape/outside interaction.
- Only expose actions supported by the feature API. Preserve loading, unavailable, archived, and saving guards.
- Check frontend transformations, lint, and relevant existing behavior tests. Verify desktop and mobile appearance when a browser is available. Do not run production builds unless explicitly requested.

### Current consumer

`src/features/sales-channel/InventoryPage.jsx` reuses this pattern with Store SKU before Product name, followed by Cost, Store price, On hand, Reserved, Available, and Status columns. Its Manage product action opens one popup for stock adjustments, website details, pricing, and visibility; its batch action hides eligible store listings. One popup submits website edits through the details endpoint and optional stock changes through the established stock endpoint, so deployed servers cannot silently ignore new fields. A failed or unconfirmed stock step keeps the popup open, reloads current quantities when possible, and clears the requested adjustment before retry. The alert threshold remains separate from stock quantities. Store behavior stays in the Sales Channel feature.

## Related architecture

See `docs/ARCHITECTURE.md` for platform boundaries, repository structure, and dependency direction. This document defines the reusable frontend table standard; it does not replace those platform rules.

### Orders consumer

`src/features/sales-channel/SalesOrders.jsx` reuses the same table pattern for Orders, with Order, Customer, Total, Order status, Payment, and Fulfillment columns. Both tables share `LibraryRowActions` from `src/features/costing/components/LibraryRowActions.jsx`. Orders keeps receipt review, payment verification, pickup progression, tracking, transit dates, and delivery confirmation in its detail popup. Its selected-order Excel download uses the existing file-transfer access rules. Requests use the current workspace session through `apiJson`/`apiBlob`; no separate login or mock orders are introduced.

### Promotions consumer

`src/features/sales-channel/SalesPromotions.jsx` uses the shared library table and row action component. Its columns are Promotion, Code, Promotion type, Validity, and Status. Creation and overview use the shared Sales Channel popup layout. Create and list operations use the existing `/api/sales-channel/promotions` contract; no edit/delete action is exposed because that contract does not provide one. Delivery, pickup, and percentage offers retain the source module's inclusive Philippine-time date rules and unique generated codes.

Order Status uses a compact dropdown with supported workflow choices. Before a mutation, the existing Kostaraa confirmation shows the order and proposed change. Changes requiring receipts, tracking, or an estimated delivery date open the order detail popup to collect/review them first.

### Product Reviews consumer

`src/features/sales-channel/SalesReviews.jsx` reuses the shared library table, row actions, and Sales Channel popup. Pending approval is the default view. The existing authenticated reviews endpoint is paged in batches of 50 per status; the workspace loads every status before applying its shared search and 10-item pagination. Review details include the full comment and private customer email. Approve/publish, reject, and move-to-pending actions use the existing moderation API and Kostaraa confirmation. Batch publication records each successful update and reports partial failures without claiming that all reviews were published. Public storefront visibility remains controlled by the backend's approved-only catalog.

### Leaderboards consumer

`src/features/sales-channel/SalesBestSellers.jsx` is displayed as **Leaderboards** in the sidebar and page heading. It provides a read-only product leaderboard using the shared library card, toolbar, rows, numeric cells, and pagination. The backend's top-50 paid-unit ranking remains authoritative for product ranks and storefront badges. Read-only rankings omit selection checkboxes and mutation menus because they have no batch management operation.

A 70/30 desktop grid places the product leaderboard left and customer leaderboard right, stacking below 1100px. Customers are grouped from authenticated order snapshots by trimmed, lowercased email; blank emails are excluded and duplicate order IDs are counted once. One qualifying paid order is New; two or more are Returning. Rank by order count, then paid order value, then email for deterministic ties. Qualifying statuses are received, processing, waiting for courier, in transit, or completed; unpaid, cancelled, and returned orders are excluded. The existing order-list API lacks refund amounts, so customer order value is not represented as net revenue or a refund-adjusted metric. This customer panel covers the owner's order list, while product rankings retain the backend's active store-channel scope. Each panel has independent error handling, search, and pagination.

### Sales Channel account access

Sales Channel is limited to `patchkinstudio@gmail.com`, `hazeldeo1016@gmail.com`, `valerieaceron@gmail.com`, and the existing `admin` username. Password validation stays in the normal login flow; never hardcode or store credentials in module access rules.

The workspace checks `/api/sales-channel/access`, hides the entire sidebar group unless allowed, and prevents direct Sales Channel pages from mounting while access is denied, loading, or unverified. The server checks the active authenticated account record through `middlewares/sales_channel_access.js`, with the shared `/sales-channel` router gate protecting reads, writes, private receipts, and future routes. Existing business ownership restrictions still apply; admin eligibility does not grant cross-account data access. Public storefront browsing and checkout remain outside this authenticated module gate. Deploy the API access endpoint and middleware along with the frontend; absent or failed capability responses fail closed.

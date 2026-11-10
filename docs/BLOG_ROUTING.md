# Dynamic blog routing and Hostinger rollout

## Verified findings (10 November 2026)

Read-only production checks returned:

| Request | Result |
| --- | --- |
| CMS `/wp-json/wp/v2/posts?slug=small-business-costing-pricing-philippines&status=publish&_embed=1` | HTTP 200, published post ID 16 |
| Public `/blog/small-business-costing-pricing-philippines` (also with trailing slash) | HTTP 404, Hostinger error document |
| Public `/blog/5-pricing-strategies-every-small-business-owner-should-know` | Redirect to trailing slash, then HTTP 200, React app shell |
| CMS request with `Origin: https://kostaraa.com` | CORS allows that origin; response is not publicly cached |

The verified failure is **before React runs**: new paths do not receive the app shell. The old build script queried CMS slugs and copied identical HTML into article directories. Existing article directories work, while the new article URL does not. `src/app/App.jsx` already selects `BlogPost` for `/blog/…`; there is no React Router dependency. This is not a CMS publishing or CORS failure.

The repository's previous `.htaccess` already contained a functional general SPA fallback. Public responses alone cannot establish whether the deployed file is missing, in the wrong directory, overridden, or unsupported. Do not claim a specific one of those causes without inspecting the origin configuration.

### Origin server verification: required before changing production

The public `Server: hcdn` header identifies Hostinger's CDN, **not** the origin web server. The CMS's `X-LiteSpeed-Cache-Control` header is not proof about the separate frontend origin.

Hostinger documents that standard Web and Cloud hosting use LiteSpeed and support `.htaccess`. VPS and managed application setups can differ. In hPanel, confirm the hosting product for **kostaraa.com**, the document root, and whether Apache-compatible per-directory rewrites are enabled. If hPanel does not expose the origin software, ask Hostinger support to confirm the virtual host's server and rewrite configuration. Do not infer it from the CDN header.

Sources: [Hostinger server access options](https://www.hostinger.com/support/which-file-transfer-and-server-access-options-are-supported-at-hostinger/), [Hostinger .htaccess support](https://www.hostinger.com/support/1583307-how-to-create-an-htaccess-file-at-hostinger/), [Apache-compatible versus Nginx configuration](https://www.hostinger.com/tutorials/locate-and-create-htaccess/).

## Repository changes

- `public/.htaccess`: real files and directories retain their handlers. Only GET/HEAD requests for known React pages and one-segment `/blog/:slug` paths receive `/index.html`. Unknown assets, API URLs, and other server paths do not receive the SPA shell. Authentication and payment route names remain supported; their implementations are unchanged.
- `scripts/hostinger-routes.mjs`: retains fixed page exports, explicitly copies `.htaccess`, and no longer contacts the CMS or creates article folders. Vite still writes the frontend into `out/`.
- `scripts/export-hostinger.sh`: the legacy export also copies the same `.htaccess` instead of embedding a second routing configuration. This script is not the current Vite build command.
- `wordpress.ts`, `Blog.tsx`, `BlogPost.tsx`: anonymous, uncached CMS reads explicitly request `status=publish&context=view`. Responses must contain published posts, and article results must match the requested slug. Malformed slugs never trigger a broad CMS request. Failed, aborted, or superseded requests cannot display stale article data. Missing/deleted/unpublished posts show the existing not-found state; API failures show the existing unavailable state. UI and CSS are unchanged.
- `blogMetadata.ts`: preserves the article title behavior and adds browser-side description (preferring the CMS SEO description), public canonical, Open Graph tags, and BlogPosting JSON-LD. Error pages are marked `noindex`. Metadata is restored on cleanup. Raw CMS head HTML is never injected.
- `tests/blog-routing.test.mjs`: covers publication filtering, invalid slugs, errors, exact article matching, request cancellation, browser metadata, and export behavior without a production build.

WordPress documents the [public post endpoint, slug and status filters](https://developer.wordpress.org/rest-api/reference/posts/). Frontend filtering is defensive; CMS access controls remain responsible for preventing private content from being returned by its API.

## Exact Hostinger change, after manual approval

No production changes have been applied. No production build has been run.

For a confirmed Apache/LiteSpeed static frontend:

1. In hPanel choose **kostaraa.com → Files → File Manager**. Open its confirmed document root, normally `public_html`. Confirm this is the directory containing the live `index.html` and `assets/`, not the CMS domain or API domain.
2. Download a backup of the live `.htaccess` outside the public web root. Inspect the existing rules, any parent rules, and `blog/.htaccess`. Preserve HTTPS redirects, security rules, and backend handlers. Do not overwrite CMS/WordPress or Node application routing with the static frontend file.
3. If this is a plain static frontend with no custom handlers, upload `public/.htaccess` as **`.htaccess`** beside the live `index.html`. Otherwise merge its frontend rewrite rules after existing backend/security handlers and before conflicting catch-all or 404 rules. An existing `blog/.htaccess` may need a separate reviewed merge; do not delete it blindly.
4. Confirm the file is named `.htaccess`, not `.htaccess.txt`, and is in the live document root. Keep the permissions consistent with the existing hosting account; do not broaden them.
5. Verify the previously failing article opens and returns the React shell with HTTP 200. A routing-only `.htaccess` upload can fix the currently deployed frontend without a build because it already fetches articles dynamically. If the response remains a Hostinger 404, have support inspect the virtual host's rewrite/override settings. If CDN caching is involved, purge the affected blog URLs through Hostinger's supported cache controls after approval. Do not disable security protections.
6. Deploy the frontend hardening changes in a separately approved normal release. A one-time frontend build/upload is needed to ship changed React code, but **subsequent posts do not need builds or deployments**. Upload the full `out/` contents, including its hidden `.htaccess`, rather than only visible files. Existing article directories can remain; they hold app shells, not snapshots of CMS content. Do not delete them as part of this fix.
7. Keep the deployed rewrite configuration in sync with this source in future releases. Restore the downloaded `.htaccess` backup if a routing regression occurs.

For a confirmed Nginx origin, `.htaccess` has no effect. Have the server administrator review and merge the following into the **frontend** server block, keeping existing API/proxy handlers and static MIME configuration intact:

```nginx
location ~ ^/blog/[^/]+/?$ {
    try_files $uri $uri/ /index.html;
}
location ~ ^/(affiliate-application|forgot-password|reset-password|verify-email|about|blog|contact|login|onboarding|payment|pricing|privacy|signup|terms|workspace)/?$ {
    try_files $uri $uri/ /index.html;
}
```

This is a conditional example, not a verified production configuration. Existing location precedence, method handling, the document root, and any application proxy must be reviewed first. Retain real 404s for missing static assets. An administrator must validate the complete Nginx configuration before an approved reload. For a managed Node app, correct the app's frontend fallback through its supported serving configuration rather than replacing platform routing in `.htaccess`.

## SEO compatibility and remaining architecture work

The deployed article HTML currently contains the generic site title/description and an empty React root. No frontend canonical/OG/schema or sitemap generator was found in this repository. CMS responses include Yoast metadata, but its canonical, graph IDs, and sitemap URLs target `cms.kostaraa.com`; these must not be blindly copied to public frontend articles. This change does not alter CMS SEO settings, records, or existing sitemap endpoints.

Browser metadata improves the rendered page; it does **not** guarantee that social crawlers receive article metadata. SPA not-found/unavailable views also retain an HTTP 200 app-shell response (a soft 404). Client `noindex` helps JS-capable crawlers but is not a replacement for correct server status codes.

For full SEO, use an approved request-time frontend renderer or managed prerendering layer for `/blog/:slug`. It should fetch the anonymous published-only CMS endpoint, return sanitized article HTML and metadata using `https://kostaraa.com/blog/{slug}`, emit 404 for missing/unpublished content and 503 for CMS failure, and keep cached content synchronized with publication/unpublication. Add a dynamic sitemap for public frontend URLs from the published CMS feed, with pagination and `lastmod`, rather than relying on build-time slug snapshots or the CMS-domain sitemap. Sitemap errors must not publish incomplete/stale private entries. This requires separate hosting/architecture approval; no renderer, CMS webhook, sitemap service, or backend change is implemented here.

The runtime frontend fetches fresh content whenever the listing/article is opened or refreshed. It does not poll an already-open tab for editorial changes. Public CMS/CDN caching must also honor publication changes; the client cannot override a stale origin response or revoke content already delivered to an open browser.

## Validation and release checklist

Repository checks (no build):

```sh
node --experimental-strip-types --test tests/blog-routing.test.mjs
npm run test:contracts
npm run lint
bash -n scripts/export-hostinger.sh
```

The focused tests and full contract suite pass. The repository-wide lint command currently reports five unrelated `no-undef` errors for `CustomEvent`/`HTMLInputElement` in `Grid.jsx` and `Inventory.jsx`; these were left unchanged. Local Apache 2.4 tests verified new slug fallback, trailing slash, HEAD, existing article directory, asset MIME type, API file passthrough, unknown API/asset 404s, and POST exclusion. This validates Apache syntax/behavior, not production LiteSpeed configuration.

After the approved hosting change and frontend release:

- Open an existing article and the currently failing article directly in a fresh tab; hard-refresh both, with and without a trailing slash. Expect HTTP 200 app shell and the correct article.
- Verify `/blog` shows the latest published post and pagination still works. Confirm no article-specific directory is needed.
- Have the content owner publish their next normal post (do not alter CMS records as part of this routing task). Without a frontend build/upload, open its URL, refresh it, and verify it appears in the listing.
- Test invalid, deleted, and unpublished slugs using controlled staging fixtures. Expect not found, no article body, no stale article schema, and `noindex`. Draft/private/pending/future responses must never render as published articles.
- Block/fail the CMS request in browser developer tools. Expect loading followed by unavailable; no previous article content. Restore network access and refresh to recover.
- Verify the browser title, meta description, public canonical, OG tags, and JSON-LD after the article loads. Separately inspect raw HTML/social previews to confirm the documented renderer limitation.
- Confirm real images, CSS and JS return correct content types. Missing assets and `/api/nonexistent` must not return the app shell. Compare existing API responses before/after.
- Smoke-test existing login, signup, verification/reset links and payment navigation without changing authentication, submitting payments, or modifying records.

Manual approval gates: production `.htaccess` merge/upload; any cache purge or server configuration/reload; the one-time production build and release of frontend changes; and any future request-time SEO renderer/sitemap architecture. None was performed by this task.

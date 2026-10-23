import { copyFileSync, existsSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";

const out = resolve("out");
const source = resolve(out, "index.html");
if (!existsSync(source)) throw new Error("out/index.html was not generated");
const routes = ["about", "blog", "contact", "login", "onboarding", "pricing", "privacy", "signup", "verify-email", "terms", "workspace"];
for (const route of routes) {
  const directory = resolve(out, route);
  mkdirSync(directory, { recursive: true });
  copyFileSync(source, resolve(directory, "index.html"));
}

let articleRoutes = 0;
try {
  const endpoint = new URL("https://cms.kostaraa.com/wp-json/wp/v2/posts");
  endpoint.searchParams.set("per_page", "100");
  endpoint.searchParams.set("_fields", "slug");
  const response = await globalThis.fetch(endpoint, { headers: { Accept: "application/json" } });
  if (!response.ok) throw new Error(`WordPress returned ${response.status}`);

  const posts = await response.json();
  for (const post of posts) {
    if (!post?.slug || post.slug === "hello-world") continue;
    const directory = resolve(out, "blog", post.slug);
    mkdirSync(directory, { recursive: true });
    copyFileSync(source, resolve(directory, "index.html"));
    articleRoutes += 1;
  }
} catch (error) {
  console.warn(`Could not create CMS article fallback pages: ${error instanceof Error ? error.message : error}`);
}

console.log(`Created Hostinger fallback pages for ${routes.length} routes and ${articleRoutes} published articles.`);

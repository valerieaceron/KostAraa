import { copyFileSync, existsSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";

const out = resolve("out");
const source = resolve(out, "index.html");
if (!existsSync(source)) throw new Error("out/index.html was not generated");
const routes = ["affiliate-application", "forgot-password", "reset-password", "about", "blog", "contact", "login", "onboarding", "payment", "pricing", "privacy", "signup", "verify-email", "terms", "workspace"];
for (const route of routes) {
  const directory = resolve(out, route);
  mkdirSync(directory, { recursive: true });
  copyFileSync(source, resolve(directory, "index.html"));
}

// Article slugs are resolved by React and the CMS at request time, never at build time.
// Copy explicitly so dotfile omission cannot silently remove the routing configuration.
copyFileSync(resolve("public/.htaccess"), resolve(out, ".htaccess"));
console.log(`Created Hostinger fallback pages for ${routes.length} routes. Blog articles use the SPA fallback.`);

import { copyFileSync, existsSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";

const out = resolve("out");
const source = resolve(out, "index.html");
if (!existsSync(source)) throw new Error("out/index.html was not generated");
const routes = ["about", "blog", "contact", "login", "onboarding", "pricing", "privacy", "signup", "terms", "workspace"];
for (const route of routes) {
  const directory = resolve(out, route);
  mkdirSync(directory, { recursive: true });
  copyFileSync(source, resolve(directory, "index.html"));
}
console.log(`Created Hostinger fallback pages for ${routes.length} routes.`);

import { readFileSync } from "node:fs";

const protectedEntries = [
  "src/app/App.jsx",
  "src/features/marketing/pages/Home.tsx",
  "src/components/araa-chat/AraaChat.tsx",
];
const forbidden = [
  /BusinessPlan/,
  /business-plan\.css/,
  /paperKnowledge/,
  /Business-plan guide/,
  /Ask me about the Kostaraa business plan/,
  /\/presentation["']/,
];

const violations = [];
for (const file of protectedEntries) {
  const source = readFileSync(new URL(`../${file}`, import.meta.url), "utf8");
  for (const pattern of forbidden) {
    if (pattern.test(source)) violations.push(`${file}: ${pattern}`);
  }
}

if (violations.length) {
  console.error("\nBuild stopped: presentation code is connected to the Kostaraa landing/workspace app.");
  for (const violation of violations) console.error(`- ${violation}`);
  console.error("Keep presentation files isolated from the application shell, Home page, and Araa.\n");
  process.exit(1);
}

console.log("Presentation isolation guard: passed");

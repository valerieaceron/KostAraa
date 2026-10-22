import { defineConfig, globalIgnores } from "eslint/config";

const browserGlobals = {
  Blob: "readonly",
  FileReader: "readonly",
  FormData: "readonly",
  URL: "readonly",
  URLSearchParams: "readonly",
  clearTimeout: "readonly",
  console: "readonly",
  crypto: "readonly",
  document: "readonly",
  fetch: "readonly",
  localStorage: "readonly",
  navigator: "readonly",
  sessionStorage: "readonly",
  setTimeout: "readonly",
  window: "readonly",
};

const nodeGlobals = {
  URL: "readonly",
  console: "readonly",
  process: "readonly",
};

export default defineConfig([
  globalIgnores(["node_modules/**", "out/**", "dist/**"]),
  {
    files: ["src/**/*.{js,jsx}"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      parserOptions: { ecmaFeatures: { jsx: true } },
      globals: browserGlobals,
    },
    rules: {
      "no-undef": "error",
    },
  },
  {
    files: ["scripts/**/*.mjs", "vite.config.js"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals: nodeGlobals,
    },
    rules: {
      "no-undef": "error",
    },
  },
]);

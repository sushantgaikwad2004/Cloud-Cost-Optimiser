import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const outputPath = path.join(__dirname, "..", "public", "cco-runtime-config.js");

const rawBaseUrl =
  process.env.VITE_PUBLIC_API_BASE_URL ||
  process.env.VITE_API_BASE_URL ||
  "http://localhost:5000";

const normalizedBaseUrl = String(rawBaseUrl || "")
  .trim()
  .replace(/\/+$/, "");

const safeBaseUrl = normalizedBaseUrl || "http://localhost:5000";

const runtimeScript = `window.__CCO_RUNTIME__ = Object.assign({}, window.__CCO_RUNTIME__, { apiBaseUrl: ${JSON.stringify(
  safeBaseUrl
)} });\n`;

await fs.writeFile(outputPath, runtimeScript, "utf-8");
console.log(`Runtime API base configured: ${safeBaseUrl}`);

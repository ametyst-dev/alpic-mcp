import { readFileSync, writeFileSync } from "fs";

const file = "node_modules/skybridge/dist/server/server.js";
const src = readFileSync(file, "utf8");

const old = `const pathname = extra?.requestInfo?.url?.pathname ?? "";
                const url = \`\${serverUrl}\${pathname}\`;`;
const fix = `const url = serverUrl;`;

if (src.includes(fix) && !src.includes(old)) {
  console.log("[patch-skybridge] Already patched, skipping.");
  process.exit(0);
}

if (!src.includes(old)) {
  console.warn("[patch-skybridge] Could not find target code — skybridge may have been updated. Skipping.");
  process.exit(0);
}

writeFileSync(file, src.replace(old, fix));
console.log("[patch-skybridge] Patched ui.domain hash to use serverUrl without pathname.");

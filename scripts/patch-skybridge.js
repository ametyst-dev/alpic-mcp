import { readFileSync, writeFileSync, existsSync } from "fs";

const file = "node_modules/skybridge/dist/server/server.js";

if (!existsSync(file)) {
  console.warn("[patch-skybridge] File not found, skipping:", file);
  process.exit(0);
}

const src = readFileSync(file, "utf8");

// Match any variant: with or without the pathname line
const pattern = /const pathname = extra\?\.requestInfo\?\.url\?\.pathname \?\? "";\s*\n\s*const url = `\$\{serverUrl\}\$\{pathname\}`;/;
const alreadyPatched = src.includes("const url = serverUrl;");

if (alreadyPatched && !pattern.test(src)) {
  console.log("[patch-skybridge] Already patched, skipping.");
  process.exit(0);
}

if (!pattern.test(src)) {
  console.warn("[patch-skybridge] Could not find target code — skybridge may have been updated. Skipping.");
  process.exit(0);
}

writeFileSync(file, src.replace(pattern, "const url = serverUrl;"));
console.log("[patch-skybridge] Patched ui.domain hash to use serverUrl without pathname.");

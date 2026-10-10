// Post-build steps (run via `npm run build`):
// 1. Mark dist/cjs as CommonJS so it can be require()'d even though the
//    package root sets `"type": "module"`.
// 2. Copy the generated OpenAPI types next to the emitted declarations.
//    tsc does not emit outputs for `.d.ts` inputs, but dist/*/index.d.ts
//    references `./types/blurfield-api.js`, so the file must be shipped
//    manually for consumer type resolution to work.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const generatedTypes = path.resolve(root, "src/types/blurfield-api.d.ts");

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

// 1. CJS package marker
const cjsDir = path.resolve(root, "dist/cjs");
if (!fs.existsSync(cjsDir)) {
  console.error(`postbuild: expected output directory ${cjsDir} does not exist. Run tsc first.`);
  process.exit(1);
}
fs.writeFileSync(path.join(cjsDir, "package.json"), JSON.stringify({ type: "commonjs" }, null, 2) + "\n");
console.log("Wrote dist/cjs/package.json");

// 2. Ship generated types with both module formats
for (const format of ["esm", "cjs"]) {
  const targetDir = path.resolve(root, `dist/${format}/types`);
  ensureDir(targetDir);
  fs.copyFileSync(generatedTypes, path.join(targetDir, "blurfield-api.d.ts"));
  console.log(`Copied types to dist/${format}/types/blurfield-api.d.ts`);
}

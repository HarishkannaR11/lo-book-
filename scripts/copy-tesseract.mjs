// Copies the on-device OCR engine into public/tesseract so it is served from our own origin
// (works offline once cached; no third-party CDN). Runs on postinstall and before build.
import { copyFile, mkdir } from "node:fs/promises";
import { createRequire } from "node:module";
import path from "node:path";

const require = createRequire(import.meta.url);
const pkgDir = (name) => path.dirname(require.resolve(`${name}/package.json`));
const out = "public/tesseract";

await mkdir(`${out}/lang`, { recursive: true });
await copyFile(path.join(pkgDir("tesseract.js"), "dist/worker.min.js"), `${out}/worker.min.js`);
// LSTM-only builds; tesseract.js picks relaxed-SIMD, SIMD or plain at runtime.
for (const f of ["tesseract-core-lstm.wasm.js", "tesseract-core-simd-lstm.wasm.js", "tesseract-core-relaxedsimd-lstm.wasm.js"]) {
  await copyFile(path.join(pkgDir("tesseract.js-core"), f), `${out}/${f}`);
}
// "best_int": the accurate model, quantised to 2.9 MB.
await copyFile(path.join(pkgDir("@tesseract.js-data/eng"), "4.0.0_best_int/eng.traineddata.gz"), `${out}/lang/eng.traineddata.gz`);
console.log("tesseract assets copied to public/tesseract");

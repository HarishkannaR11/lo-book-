/**
 * On-device OCR (Tesseract, English, LSTM). Runs entirely on the phone: no network once the
 * engine (~7 MB) has been cached by the service worker, so it works at a bunk with no signal.
 * Loaded lazily — nothing here is in the main bundle until the owner taps "Scan".
 */
import type { Worker } from "tesseract.js";
import { parseExpiry } from "./parse-expiry";
import { parseSlip, type SlipReading } from "./parse-slip";

let workerPromise: Promise<Worker> | null = null;

function getWorker(): Promise<Worker> {
  workerPromise ??= (async () => {
    const { createWorker, OEM } = await import("tesseract.js");
    return createWorker("eng", OEM.LSTM_ONLY, {
      workerPath: "/tesseract/worker.min.js",
      corePath: "/tesseract",
      langPath: "/tesseract/lang",
      gzip: true,
      workerBlobURL: false, // same-origin worker, so the service worker can serve it offline
    });
  })().catch((err: unknown) => {
    workerPromise = null;
    throw err;
  });
  return workerPromise;
}

/** Grayscale, stretch contrast between the 2nd and 98th percentile, ~1600 px long side. */
async function prepare(file: Blob): Promise<HTMLCanvasElement> {
  const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  const scale = 1600 / Math.max(bitmap.width, bitmap.height);
  const w = Math.round(bitmap.width * scale);
  const h = Math.round(bitmap.height * scale);
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) throw new Error("canvas unavailable");
  ctx.drawImage(bitmap, 0, 0, w, h);
  bitmap.close();

  const image = ctx.getImageData(0, 0, w, h);
  const px = image.data;
  const hist = new Uint32Array(256);
  for (let i = 0; i < px.length; i += 4) {
    const y = ((px[i] ?? 0) * 299 + (px[i + 1] ?? 0) * 587 + (px[i + 2] ?? 0) * 114) / 1000;
    px[i] = y;
    hist[Math.round(y)] = (hist[Math.round(y)] ?? 0) + 1;
  }
  const total = w * h;
  let lo = 0;
  let hi = 255;
  for (let acc = 0; lo < 255 && (acc += hist[lo] ?? 0) < total * 0.02; ) lo++;
  for (let acc = 0; hi > 0 && (acc += hist[hi] ?? 0) < total * 0.02; ) hi--;
  const range = Math.max(1, hi - lo);
  for (let i = 0; i < px.length; i += 4) {
    const v = Math.min(255, Math.max(0, (((px[i] ?? 0) - lo) * 255) / range));
    px[i] = px[i + 1] = px[i + 2] = v;
  }
  ctx.putImageData(image, 0, 0);
  return canvas;
}

async function recognise(canvas: HTMLCanvasElement, psm: "3" | "6" | "11"): Promise<string> {
  const worker = await getWorker();
  await worker.setParameters({ tessedit_pageseg_mode: psm as never, preserve_interword_spaces: "1" });
  const { data } = await worker.recognize(canvas);
  return data.text;
}

/**
 * Bunk slip → litres, amount, rate, date. Reads as one text block first (best for receipts),
 * then as sparse text if the numbers don't multiply out.
 */
export async function readSlip(file: Blob): Promise<SlipReading> {
  const canvas = await prepare(file);
  let best: SlipReading | null = null;
  for (const psm of ["6", "11"] as const) {
    const reading = parseSlip(await recognise(canvas, psm));
    if (!best || (reading.consistent && !best.consistent)) best = reading;
    if (reading.consistent && !reading.repaired) break;
  }
  return best ?? parseSlip("");
}

/** FC / insurance / permit / PUC photo → the expiry date, if one can be found. */
export async function readExpiry(file: Blob, today: string): Promise<string | null> {
  const canvas = await prepare(file);
  for (const psm of ["3", "11"] as const) {
    const { expiresOn } = parseExpiry(await recognise(canvas, psm), today);
    if (expiresOn) return expiresOn;
  }
  return null;
}

/** Download and initialise the engine ahead of time so the first scan also works offline. */
export async function warmOcr(): Promise<void> {
  await getWorker();
}

/** Shrinks a camera photo for upload: JPEG, 1280 px long side. Typically 100–250 KB. */
export async function compressPhoto(file: Blob): Promise<Blob> {
  const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  const scale = Math.min(1, 1280 / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d")?.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("encode failed"))), "image/jpeg", 0.72),
  );
}

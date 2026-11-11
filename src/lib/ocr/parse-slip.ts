/**
 * Reads a diesel bunk slip from OCR text. Pure and deterministic, so it is unit-tested
 * without a camera. Nothing here is saved: the result only pre-fills the form, and the owner
 * confirms every number.
 *
 * Two independent routes, and they must agree before we call the reading "consistent":
 *   1. Labels: "VOLUME(L) : 54.10", "AMOUNT(Rs) 5000.00", "RATE 92.43".
 *   2. Arithmetic: any rate × litres ≈ amount triple among the numbers on the slip. This
 *      survives garbled labels, which thermal paper and phone cameras produce constantly.
 */

export type SlipReading = {
  litres: number | null;
  amount: number | null;
  rate: number | null;
  date: string | null; // YYYY-MM-DD
  odometer: number | null;
  /** True only when rate × litres matches the amount on the slip. */
  consistent: boolean;
  /** A field corrected by one OCR-misread digit so the three agree; the UI asks to check it. */
  repaired: "litres" | "amount" | "rate" | null;
};

type Num = { value: number; decimals: number; line: number; label: Field | null };
type Field = "litres" | "amount" | "rate" | "odometer";

const LABELS: Record<Field, RegExp> = {
  rate: /\b(rate|price|rs\s*\/\s*l(tr|it)?|₹\s*\/\s*l|per\s*l(tr|itre)?)\b/i,
  litres: /\b(vol(ume)?|qty|quantity|lit(re|er)s?|ltrs?|ltr|lts?)\b/i,
  amount: /\b(amount|amt|total|sale|net\s*amt|value|rs\.?|inr)\b|₹/i,
  odometer: /\b(odo(meter)?|km\s*reading|kms?|kilometre?s?)\b/i,
};

/** Fixes the classic OCR swaps inside numbers: O→0, l/I/|→1, S→5, B→8, and comma decimals. */
export function normaliseDigits(line: string): string {
  return line
    .replace(/(?<=\d)[oO](?=[\d.,/-])|(?<=[\d.,/-])[oO](?=\d)|(?<=[\d.,])[oO]\b|(?<![A-Za-z])[oO](?=\d)/g, "0")
    .replace(/(?<=\d)[lI|](?=[\d.,/-])|(?<=[\d.,/-])[lI|](?=\d)|(?<![A-Za-z])[lI|](?=\d)/g, "1")
    .replace(/(?<=\d)S(?=\d)/g, "5")
    .replace(/(?<=\d)B(?=\d)/g, "8")
    .replace(/(\d),(\d{3})(?!\d)/g, "$1$2") // 5,000.00 → 5000.00
    .replace(/(\d),(\d{1,2})(?!\d)/g, "$1.$2") // 54,10 → 54.10
    .replace(/(\d)\s*\.\s+(\d{2})(?!\d)/g, "$1.$2"); // "54. 10" → 54.10
}

function labelOf(line: string): Field | null {
  // Order matters: "Rs/L" is a rate, and a bare "Rs" is an amount.
  if (LABELS.rate.test(line)) return "rate";
  if (LABELS.litres.test(line)) return "litres";
  if (LABELS.odometer.test(line)) return "odometer";
  if (LABELS.amount.test(line)) return "amount";
  return null;
}

function numbersIn(text: string): Num[] {
  const out: Num[] = [];
  text.split(/\r?\n/).forEach((raw, line) => {
    if (DATE_RE.test(raw) || TIME_RE.test(raw)) {
      // Dates and times are read separately; don't let 11/11/2026 pose as a quantity.
      raw = raw.replace(DATE_RE_G, " ").replace(TIME_RE_G, " ");
    }
    const clean = normaliseDigits(raw);
    const label = labelOf(clean);
    for (const m of clean.matchAll(/(?<![\d.])(\d{1,7})(?:\.(\d{1,3}))?(?![\d.])/g)) {
      const whole = m[1] ?? "";
      const frac = m[2] ?? "";
      out.push({ value: Number(frac ? `${whole}.${frac}` : whole), decimals: frac.length, line, label });
    }
  });
  return out;
}

const round2 = (n: number) => Math.round(n * 100) / 100;
const matches = (rate: number, litres: number, amount: number) =>
  Math.abs(rate * litres - amount) <= Math.max(1, amount * 0.006);

const plausible = {
  rate: (n: number) => n >= 50 && n <= 200,
  litres: (n: number) => n >= 1 && n <= 1500,
  amount: (n: number) => n >= 50 && n <= 300000,
  odometer: (n: number) => n >= 100 && n <= 9999999,
};

/** Last plausible number on a line carrying this label (values sit right of their labels). */
function labelled(nums: Num[], field: Field): number | null {
  const hits = nums.filter((n) => n.label === field && plausible[field](n.value));
  const lines = [...new Set(hits.map((h) => h.line))];
  for (const line of lines) {
    const onLine = hits.filter((h) => h.line === line);
    const pick = onLine[onLine.length - 1];
    if (pick) return pick.value;
  }
  return null;
}

/** Best rate × litres = amount triple among all numbers, preferring labelled, 2-decimal values. */
function arithmeticTriple(nums: Num[]): { rate: number; litres: number; amount: number } | null {
  const decimals = nums.filter((n) => n.decimals > 0 || n.value >= 50);
  let best: { score: number; rate: number; litres: number; amount: number } | null = null;
  for (const r of decimals) {
    if (!plausible.rate(r.value) || r.decimals === 0) continue;
    for (const v of decimals) {
      if (v === r || !plausible.litres(v.value) || v.decimals === 0) continue;
      for (const a of nums) {
        if (a === r || a === v || !plausible.amount(a.value)) continue;
        if (!matches(r.value, v.value, a.value)) continue;
        const score =
          (r.label === "rate" ? 3 : 0) +
          (v.label === "litres" ? 3 : 0) +
          (a.label === "amount" ? 3 : 0) +
          (a.decimals === 2 ? 1 : 0) -
          Math.abs(r.value * v.value - a.value) / Math.max(a.value, 1);
        if (!best || score > best.score) best = { score, rate: r.value, litres: v.value, amount: a.value };
      }
    }
  }
  return best && { rate: best.rate, litres: best.litres, amount: best.amount };
}

const DATE_RE = /\b(\d{1,2})[/.-](\d{1,2})[/.-](\d{2,4})\b/;
const DATE_RE_G = new RegExp(DATE_RE.source, "g");
const TIME_RE = /\b\d{1,2}:\d{2}(:\d{2})?\b/;
const TIME_RE_G = new RegExp(TIME_RE.source, "g");

export function isoDate(day: number, month: number, year: number): string | null {
  const y = year < 100 ? 2000 + year : year;
  if (y < 2000 || y > 2100 || month < 1 || month > 12 || day < 1) return null;
  const d = new Date(Date.UTC(y, month - 1, day));
  if (d.getUTCDate() !== day) return null; // 31/02 and friends
  return `${y}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function slipDate(text: string): string | null {
  for (const line of text.split(/\r?\n/)) {
    const m = DATE_RE.exec(normaliseDigits(line));
    if (m) {
      const iso = isoDate(Number(m[1]), Number(m[2]), Number(m[3])); // Indian slips are DD/MM/YYYY
      if (iso) return iso;
    }
  }
  return null;
}

/** Same length, exactly one digit different: the signature of a single OCR misread. */
function oneDigitOff(read: number, computed: number): boolean {
  const a = read.toFixed(2);
  const b = computed.toFixed(2);
  if (a.length !== b.length || a === b) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) diff++;
  return diff === 1;
}

/** All three labelled but they don't multiply out: fix the one field that is one digit off. */
function repair(rate: number, litres: number, amount: number): Pick<SlipReading, "rate" | "litres" | "amount" | "repaired"> | null {
  const options = [
    { repaired: "litres" as const, read: litres, computed: round2(amount / rate) },
    { repaired: "amount" as const, read: amount, computed: round2(rate * litres) },
    { repaired: "rate" as const, read: rate, computed: round2(amount / litres) },
  ].filter((o) => oneDigitOff(o.read, o.computed));
  const only = options.length === 1 ? options[0] : undefined;
  if (!only) return null; // ambiguous: don't guess
  const fixed = { rate, litres, amount, [only.repaired]: only.computed };
  return { ...fixed, repaired: only.repaired };
}

export function parseSlip(text: string): SlipReading {
  const nums = numbersIn(text);
  const byLabel = {
    rate: labelled(nums, "rate"),
    litres: labelled(nums, "litres"),
    amount: labelled(nums, "amount"),
  };
  const odometer = labelled(nums, "odometer");
  const date = slipDate(text);

  if (byLabel.rate && byLabel.litres && byLabel.amount && matches(byLabel.rate, byLabel.litres, byLabel.amount)) {
    return { ...byLabel, date, odometer, consistent: true, repaired: null };
  }
  const triple = arithmeticTriple(nums);
  if (triple) return { ...triple, date, odometer, consistent: true, repaired: null };
  if (byLabel.rate && byLabel.litres && byLabel.amount) {
    const fixed = repair(byLabel.rate, byLabel.litres, byLabel.amount);
    if (fixed) return { ...fixed, date, odometer, consistent: true };
  }

  // Partial read: fill what the labels gave, derive litres only from a labelled rate and amount.
  const litres = byLabel.litres ?? (byLabel.rate && byLabel.amount ? round2(byLabel.amount / byLabel.rate) : null);
  return { litres, amount: byLabel.amount, rate: byLabel.rate, date, odometer, consistent: false, repaired: null };
}

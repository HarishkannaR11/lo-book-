/**
 * Finds the expiry date on an FC, insurance, permit or pollution certificate from OCR text.
 * Pure; the result only pre-fills the date field for the owner to confirm.
 *
 * Certificates carry several dates (issue, registration, "from"). The expiry is the one next
 * to "valid upto / till / expiry / to", or the later of a "from … to …" pair.
 */
import { isoDate, normaliseDigits } from "./parse-slip";

const MONTHS: Record<string, number> = {
  jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6, jul: 7, aug: 8, sep: 9, sept: 9, oct: 10, nov: 11, dec: 12,
};

const EXPIRY_WORDS =
  /(valid\s*(up\s*to|upto|till|until|thru|through|to)|expir\w*|up\s*to|upto|till|\bto\b|end\s*date|ends?\s*on|due\s*date|fitness\s*valid|validity|renewal\s*date)/i;
const START_WORDS = /(\bfrom\b|issue\w*|registration|reg\.?\s*date|start\w*|commenc\w*|inspection|date\s*of\s*birth|dob)/i;

type Candidate = { iso: string; line: number; index: number; score: number };

function datesOnLine(line: string): { iso: string; index: number }[] {
  const out: { iso: string; index: number }[] = [];
  const text = normaliseDigits(line);
  for (const m of text.matchAll(/\b(\d{1,2})[/.-](\d{1,2})[/.-](\d{4}|\d{2})\b/g)) {
    const iso = isoDate(Number(m[1]), Number(m[2]), Number(m[3]));
    if (iso) out.push({ iso, index: m.index ?? 0 });
  }
  for (const m of text.matchAll(/\b(\d{1,2})[\s/.-]*([A-Za-z]{3,9})[\s/.,-]*(\d{4})\b/g)) {
    const month = MONTHS[(m[2] ?? "").slice(0, 4).toLowerCase()] ?? MONTHS[(m[2] ?? "").slice(0, 3).toLowerCase()];
    const iso = month ? isoDate(Number(m[1]), month, Number(m[3])) : null;
    if (iso) out.push({ iso, index: m.index ?? 0 });
  }
  for (const m of text.matchAll(/\b(\d{4})-(\d{2})-(\d{2})\b/g)) {
    const iso = isoDate(Number(m[3]), Number(m[2]), Number(m[1]));
    if (iso) out.push({ iso, index: m.index ?? 0 });
  }
  return out.sort((a, b) => a.index - b.index);
}

export function parseExpiry(text: string, today: string): { expiresOn: string | null; candidates: string[] } {
  const lines = text.split(/\r?\n/);
  const found: Candidate[] = [];

  lines.forEach((line, lineNo) => {
    const dates = datesOnLine(line);
    dates.forEach((d, i) => {
      const before = normaliseDigits(line).slice(0, d.index);
      const prevLine = lines[lineNo - 1] ?? "";
      let score = 0;
      if (EXPIRY_WORDS.test(before.slice(-40))) score += 5;
      else if (dates.length === 1 && EXPIRY_WORDS.test(prevLine) && !START_WORDS.test(prevLine)) score += 3;
      if (START_WORDS.test(before.slice(-25)) && !EXPIRY_WORDS.test(before.slice(-12))) score -= 4;
      if (dates.length >= 2 && i === dates.length - 1) score += 2; // "from X to Y" → Y
      if (d.iso >= today) score += 2; // an expiry worth tracking is usually ahead of us
      found.push({ iso: d.iso, line: lineNo, index: d.index, score });
    });
  });

  if (found.length === 0) return { expiresOn: null, candidates: [] };
  found.sort((a, b) => b.score - a.score || (a.iso < b.iso ? 1 : -1));
  const candidates = [...new Set(found.map((f) => f.iso))];
  return { expiresOn: found[0]?.iso ?? null, candidates };
}

/**
 * Fails if the locale files drift apart: every key in en.json must exist in ta.json and vice
 * versa, no value may be empty, and ICU placeholders ({phone}, {count}…) must match.
 * TypeScript separately rejects any t("key") that is not in en.json.
 */
import { readFileSync } from "node:fs";

type Tree = { [key: string]: string | Tree };
const load = (locale: string): Tree => JSON.parse(readFileSync(`messages/${locale}.json`, "utf8")) as Tree;

function flatten(tree: Tree, prefix = ""): Map<string, string> {
  const out = new Map<string, string>();
  for (const [key, value] of Object.entries(tree)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (typeof value === "string") out.set(path, value);
    else for (const [k, v] of flatten(value, path)) out.set(k, v);
  }
  return out;
}

const placeholders = (s: string) => [...s.matchAll(/\{(\w+)[,}]/g)].map((m) => m[1]).sort().join(",");

const base = flatten(load("en"));
const problems: string[] = [];
for (const locale of ["ta"]) {
  const other = flatten(load(locale));
  for (const key of base.keys()) if (!other.has(key)) problems.push(`${locale}: missing ${key}`);
  for (const key of other.keys()) if (!base.has(key)) problems.push(`${locale}: extra ${key} (not in en)`);
  for (const [key, value] of other) {
    if (!value.trim()) problems.push(`${locale}: empty ${key}`);
    const en = base.get(key);
    if (en !== undefined && placeholders(en) !== placeholders(value)) {
      problems.push(`${locale}: placeholders differ for ${key}: en {${placeholders(en)}} vs {${placeholders(value)}}`);
    }
  }
}
for (const [key, value] of base) if (!value.trim()) problems.push(`en: empty ${key}`);

if (problems.length) {
  console.error(problems.join("\n"));
  process.exit(1);
}
console.log(`i18n OK: ${base.size} keys, ta and en in sync`);

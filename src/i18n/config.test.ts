import assert from "node:assert/strict";
import { test } from "node:test";
import { negotiateLocale } from "./config";

test("phone language picks the app language", () => {
  assert.equal(negotiateLocale("te-IN,te;q=0.9,en-US;q=0.8,en;q=0.7"), "te");
  assert.equal(negotiateLocale("hi-IN"), "hi");
  assert.equal(negotiateLocale("bn"), "bn");
  assert.equal(negotiateLocale("or-IN,en;q=0.5"), "or");
});

test("an Indian language beats English even when English is listed first", () => {
  assert.equal(negotiateLocale("en-IN,en;q=0.9,kn;q=0.8"), "kn");
});

test("English-only and unsupported phones get the Tamil default", () => {
  assert.equal(negotiateLocale("en-US,en;q=0.9"), "ta");
  assert.equal(negotiateLocale("en-IN"), "ta");
  assert.equal(negotiateLocale("fr-FR,de;q=0.8"), "ta");
  assert.equal(negotiateLocale(null), "ta");
  assert.equal(negotiateLocale(""), "ta");
});

test("q=0 means 'not this one'", () => {
  assert.equal(negotiateLocale("hi;q=0,ml;q=0.5"), "ml");
});

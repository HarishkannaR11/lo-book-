import assert from "node:assert/strict";
import { test } from "node:test";
import { parseExpiry } from "./parse-expiry";

const TODAY = "2026-11-11";

test("PUC: valid upto", () => {
  const r = parseExpiry(`POLLUTION UNDER CONTROL CERTIFICATE\nDate of Test: 10/11/2026\nValid upto: 09/05/2027\nVehicle: TN39AB1234`, TODAY);
  assert.equal(r.expiresOn, "2027-05-09");
});

test("insurance: from … to …, with words around the dates", () => {
  const r = parseExpiry(
    `Period of Insurance: From 00:00 hrs on 12/03/2026 To Midnight of 11/03/2027\nDate of issue 10/03/2026`,
    TODAY,
  );
  assert.equal(r.expiresOn, "2027-03-11");
});

test("FC with month names", () => {
  const r = parseExpiry(`CERTIFICATE OF FITNESS\nInspected on 22-Aug-2025\nFitness valid upto 21-Aug-2027`, TODAY);
  assert.equal(r.expiresOn, "2027-08-21");
});

test("permit validity range on one line", () => {
  assert.equal(parseExpiry(`Permit Validity: 01/04/2025 to 31/03/2030`, TODAY).expiresOn, "2030-03-31");
});

test("label on one line, date on the next", () => {
  assert.equal(parseExpiry(`Registration Date\n14/06/2019\nExpiry Date\n13/06/2027`, TODAY).expiresOn, "2027-06-13");
});

test("OCR swaps inside the date", () => {
  assert.equal(parseExpiry(`Valid Upto : l5/O1/2O28`, TODAY).expiresOn, "2028-01-15");
});

test("no date → null", () => {
  assert.deepEqual(parseExpiry(`blurry`, TODAY), { expiresOn: null, candidates: [] });
});

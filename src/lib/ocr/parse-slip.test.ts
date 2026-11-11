import assert from "node:assert/strict";
import { test } from "node:test";
import { normaliseDigits, parseSlip } from "./parse-slip";

test("clean IOCL-style slip: labels and arithmetic agree", () => {
  const r = parseSlip(`INDIAN OIL CORPORATION LTD
SRI MURUGAN SERVICE STATION
NH 44 KRISHNAGIRI
RECEIPT NO : 004512
DATE : 11/11/2026 TIME : 08:42
NOZZLE NO : 3
PRODUCT : HSD
RATE(Rs/L) : 92.43
VOLUME(L) : 54.10
AMOUNT(Rs) : 5000.00
VEHICLE NO : TN39AB1234
THANK YOU VISIT AGAIN`);
  assert.deepEqual(r, { litres: 54.1, amount: 5000, rate: 92.43, date: "2026-11-11", odometer: null, consistent: true, repaired: null });
});

test("garbled labels still read through rate × litres = amount", () => {
  const r = parseSlip(`BHARAT PETRO
Dt: 03-11-26 14:05:11
Prd HSD
R4te  9l.8O
V0lme 1O8.92
Amt  1O,0O0.OO
Preset 10000`);
  assert.equal(r.rate, 91.8);
  assert.equal(r.litres, 108.92);
  assert.equal(r.amount, 10000);
  assert.equal(r.date, "2026-11-03");
  assert.equal(r.consistent, true);
});

test("comma decimals and thousands separators", () => {
  const r = parseSlip(`Price : 92,43\nQty : 54,10 L\nTotal : Rs 5,000.46`);
  assert.equal(r.litres, 54.1);
  assert.equal(r.amount, 5000.46);
  assert.equal(r.consistent, true);
});

test("mobile numbers, receipt numbers and dates are not mistaken for quantities", () => {
  const r = parseSlip(`Mob 9876543210\nBill 12345\n12/10/2026\nRate 90.00\nLitres 50.00\nAmount 4500.00`);
  assert.deepEqual([r.rate, r.litres, r.amount], [90, 50, 4500]);
});

test("partial read: amount and rate only → litres derived, flagged inconsistent", () => {
  const r = parseSlip(`RATE : 92.50\nAMOUNT : 3700.00\nV#####E : ###`);
  assert.equal(r.litres, 40);
  assert.equal(r.consistent, false);
});

test("nothing readable → all nulls, never a guess", () => {
  const r = parseSlip(`~~ smudge ~~\n@@@`);
  assert.deepEqual(r, { litres: null, amount: null, rate: null, date: null, odometer: null, consistent: false, repaired: null });
});

test("odometer printed on some slips", () => {
  assert.equal(parseSlip(`KM Reading : 124530\nRate 92.00\nVol 10.00\nAmt 920.00`).odometer, 124530);
});

test("normaliseDigits fixes the usual swaps", () => {
  assert.equal(normaliseDigits("1O8.92"), "108.92");
  assert.equal(normaliseDigits("9l.8O"), "91.80");
  assert.equal(normaliseDigits("5,000.00"), "5000.00");
  assert.equal(normaliseDigits("54,10"), "54.10");
});

test("one misread digit is repaired and flagged (real Tesseract output: 108.93 read as 168.93)", () => {
  const r = parseSlip(`Price     : 91.80\nQty(Ltr)  : 168.93\nSale(Rs)  : 10000.00`);
  assert.equal(r.litres, 108.93);
  assert.equal(r.repaired, "litres");
  assert.equal(r.consistent, true);
});

test("two digits off is not repaired — the owner types it", () => {
  const r = parseSlip(`Price : 91.80\nQty : 177.93\nSale : 10000.00`);
  assert.equal(r.consistent, false);
  assert.equal(r.repaired, null);
  assert.equal(r.litres, 177.93);
});

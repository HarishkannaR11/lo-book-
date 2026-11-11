/**
 * Trip, expense and close-trip shapes, shared by the phone (validates before queueing, so a
 * bad entry never sits in the outbox) and the server actions (validate again at the boundary).
 */
import { z } from "zod";

export const EXPENSE_KINDS = ["diesel", "toll", "bata", "repair", "fine", "other"] as const;
export type ExpenseKind = (typeof EXPENSE_KINDS)[number];

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, { error: "dateInvalid" });
const money = z.number({ error: "amountInvalid" }).min(0, { error: "amountInvalid" }).max(999_999_999, { error: "amountInvalid" });
const odometer = z.number({ error: "odometerInvalid" }).int({ error: "odometerInvalid" }).min(0, { error: "odometerInvalid" }).max(9_999_999, { error: "odometerInvalid" });

/** What travels from the outbox to the server. */
export const tripWire = z.object({
  client_uuid: z.uuid(),
  vehicle_id: z.uuid({ error: "required" }),
  driver_id: z.uuid().nullable(),
  party_id: z.uuid({ error: "required" }),
  from_place: z.string().trim().min(1, { error: "required" }).max(80, { error: "tooLong" }),
  to_place: z.string().trim().min(1, { error: "required" }).max(80, { error: "tooLong" }),
  goods: z.string().trim().max(80, { error: "tooLong" }).nullable(),
  freight_amount: money,
  advance_from_party: money,
  start_odometer: odometer,
  started_on: isoDate,
});
export type TripWire = z.infer<typeof tripWire>;

export const expenseWire = z
  .object({
    client_uuid: z.uuid(),
    trip_client_uuid: z.uuid({ error: "noOpenTrip" }),
    kind: z.enum(EXPENSE_KINDS),
    amount: money.refine((n) => n > 0, { error: "amountInvalid" }),
    litres: z.number({ error: "litresInvalid" }).positive({ error: "litresInvalid" }).max(2000, { error: "litresInvalid" }).nullable(),
    odometer: odometer.nullable(),
    spent_on: isoDate,
  })
  .superRefine((v, ctx) => {
    if (v.kind === "diesel" && v.litres === null) ctx.addIssue({ code: "custom", path: ["litres"], message: "required" });
    if (v.kind !== "diesel" && v.litres !== null) ctx.addIssue({ code: "custom", path: ["litres"], message: "litresInvalid" });
  });
export type ExpenseWire = z.infer<typeof expenseWire>;

export const closeTripWire = z.object({
  trip_client_uuid: z.uuid(),
  end_odometer: odometer,
  ended_on: isoDate,
});
export type CloseTripWire = z.infer<typeof closeTripWire>;

/** Form text → number: "5,000" → 5000, "" → null, anything else non-numeric → NaN (fails zod). */
export function toNumber(value: string): number | null {
  const cleaned = value.replace(/[,\s₹]/g, "");
  if (cleaned === "") return null;
  return /^\d+(\.\d{1,3})?$/.test(cleaned) ? Number(cleaned) : Number.NaN;
}

/** Today in India, as YYYY-MM-DD. */
export function todayIST(now = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(now);
}

/**
 * Every write the owner makes goes here first: the row lands in Dexie and an outbox entry is
 * queued in the same transaction, then a sync is attempted. With no signal, nothing else
 * happens until the phone is back online.
 */
import type { CloseTripWire, ExpenseWire, TripWire } from "@/lib/trip-schemas";
import { db } from "./db";
import { syncNow } from "./sync";

const queued = (type: "trip" | "expense" | "closeTrip", ref: string) => ({
  type,
  ref,
  created_at: Date.now(),
  attempts: 0,
  error: null,
  failed: 0 as const,
});

export async function saveTripLocally(trip: TripWire): Promise<void> {
  await db.transaction("rw", db.trips, db.outbox, async () => {
    await db.trips.add({ ...trip, status: "open", end_odometer: null, ended_on: null, synced: 0 });
    await db.outbox.add(queued("trip", trip.client_uuid));
  });
  void syncNow();
}

export async function saveExpenseLocally(expense: ExpenseWire, photo: Blob | null): Promise<void> {
  await db.transaction("rw", db.expenses, db.outbox, async () => {
    await db.expenses.add({ ...expense, photo, created_at: Date.now() });
    await db.outbox.add(queued("expense", expense.client_uuid));
  });
  void syncNow();
}

/** Resolves true when the close reached the server, false when it is queued for later. */
export async function closeTripLocally(close: CloseTripWire): Promise<boolean> {
  await db.transaction("rw", db.trips, db.outbox, async () => {
    const existing = await db.trips.get(close.trip_client_uuid);
    if (existing) {
      await db.trips.update(close.trip_client_uuid, { status: "closed", end_odometer: close.end_odometer, ended_on: close.ended_on });
    } else {
      // A trip that only exists on the server (e.g. opened on another phone): mirror enough to sync the close.
      await db.trips.put({
        client_uuid: close.trip_client_uuid,
        vehicle_id: "",
        driver_id: null,
        party_id: "",
        from_place: "",
        to_place: "",
        goods: null,
        freight_amount: 0,
        advance_from_party: 0,
        start_odometer: 0,
        started_on: close.ended_on,
        status: "closed",
        end_odometer: close.end_odometer,
        ended_on: close.ended_on,
        synced: 1,
      });
    }
    await db.outbox.add(queued("closeTrip", close.trip_client_uuid));
  });
  await syncNow();
  return (await db.outbox.where("ref").equals(close.trip_client_uuid).count()) === 0;
}

export async function discardFailed(seq: number): Promise<void> {
  const item = await db.outbox.get(seq);
  if (!item) return;
  await db.transaction("rw", db.outbox, db.trips, db.expenses, async () => {
    await db.outbox.delete(seq);
    if (item.type === "expense") await db.expenses.delete(item.ref);
    if (item.type === "trip") {
      await db.trips.delete(item.ref);
      // Expenses queued against a trip that will never exist can't land either.
      const orphans = await db.expenses.where("trip_client_uuid").equals(item.ref).primaryKeys();
      await db.expenses.bulkDelete(orphans);
      await db.outbox.where("ref").anyOf([item.ref, ...orphans]).delete();
    }
  });
}

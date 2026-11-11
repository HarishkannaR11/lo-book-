/**
 * Drains the outbox oldest-first, then refreshes the local mirror from the server.
 * An entry leaves the outbox only after the server confirms it; if the reply is lost the
 * entry is simply sent again, and the server's ON CONFLICT (client_uuid) DO NOTHING makes
 * that harmless.
 */
import { pullSnapshot, pushCloseTrip, pushExpense, pushTrip, type PushResult } from "@/app/actions/sync";
import { db, type OutboxItem } from "./db";

type DrainResult = { pushed: number };
let running: Promise<DrainResult> | null = null;
const listeners = new Set<(r: DrainResult) => void>();

export function onSynced(fn: (r: DrainResult) => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

/** Safe to call any time, as often as you like: concurrent calls share one run. */
export function syncNow(): Promise<DrainResult> {
  running ??= (async () => {
    try {
      const result = await drain();
      if (navigator.onLine) await pull().catch(() => undefined);
      for (const fn of listeners) fn(result);
      return result;
    } finally {
      running = null;
    }
  })();
  return running;
}

async function push(item: OutboxItem): Promise<PushResult> {
  if (item.type === "trip") {
    const trip = await db.trips.get(item.ref);
    if (!trip) return { ok: true }; // discarded locally
    return pushTrip({
      client_uuid: trip.client_uuid,
      vehicle_id: trip.vehicle_id,
      driver_id: trip.driver_id,
      party_id: trip.party_id,
      from_place: trip.from_place,
      to_place: trip.to_place,
      goods: trip.goods,
      freight_amount: trip.freight_amount,
      advance_from_party: trip.advance_from_party,
      start_odometer: trip.start_odometer,
      started_on: trip.started_on,
    });
  }
  if (item.type === "closeTrip") {
    const trip = await db.trips.get(item.ref);
    if (!trip?.end_odometer || !trip.ended_on) return { ok: true };
    return pushCloseTrip({ trip_client_uuid: trip.client_uuid, end_odometer: trip.end_odometer, ended_on: trip.ended_on });
  }
  const expense = await db.expenses.get(item.ref);
  if (!expense) return { ok: true };
  const { photo, created_at, ...fields } = expense;
  const form = new FormData();
  form.set("expense", JSON.stringify(fields));
  if (photo) form.set("photo", new File([photo], `${expense.client_uuid}.jpg`, { type: photo.type || "image/jpeg" }));
  return pushExpense(form);
}

async function drain(): Promise<DrainResult> {
  let pushed = 0;
  for (;;) {
    if (!navigator.onLine) break;
    const item = await db.outbox.where("failed").equals(0).first();
    if (!item?.seq) break;

    let result: PushResult;
    try {
      result = await push(item);
    } catch {
      // Network dropped mid-request, or the app was redeployed under us. Keep it; try later.
      await db.outbox.update(item.seq, { attempts: item.attempts + 1, error: "network" });
      break;
    }

    if (result.ok) {
      await db.transaction("rw", db.outbox, db.trips, db.expenses, async () => {
        await db.outbox.delete(item.seq);
        if (item.type === "expense") await db.expenses.delete(item.ref); // server is now the truth
        else await db.trips.update(item.ref, { synced: 1 });
      });
      pushed++;
    } else if (result.retry) {
      await db.outbox.update(item.seq, { attempts: item.attempts + 1, error: result.error });
      break; // order matters: don't send an expense ahead of its trip
    } else {
      await db.outbox.update(item.seq, { attempts: item.attempts + 1, error: result.error, failed: 1 });
    }
  }
  return { pushed };
}

/** Replace the mirror with the server's view, keeping anything not yet synced. */
async function pull(): Promise<void> {
  const snap = await pullSnapshot();
  if (!snap) return;
  await db.transaction("rw", [db.vehicles, db.drivers, db.parties, db.trips, db.meta, db.outbox], async () => {
    const previousUser = (await db.meta.get("userId"))?.value;
    if (previousUser && previousUser !== snap.userId) {
      await db.trips.where("synced").equals(1).delete();
    }
    await db.meta.put({ key: "userId", value: snap.userId });
    await db.vehicles.clear();
    await db.vehicles.bulkPut(snap.vehicles);
    await db.drivers.clear();
    await db.drivers.bulkPut(snap.drivers);
    await db.parties.clear();
    await db.parties.bulkPut(snap.parties);

    // Anything with a write still in the outbox is the phone's newer truth: leave it alone.
    const pendingRefs = new Set((await db.outbox.toArray()).map((o) => o.ref));
    // Synced trips that are no longer open on the server were closed or cancelled.
    const open = new Set(snap.openTrips.map((t) => t.client_uuid));
    const stale = await db.trips
      .where("synced")
      .equals(1)
      .filter((t) => !open.has(t.client_uuid) && !pendingRefs.has(t.client_uuid))
      .primaryKeys();
    await db.trips.bulkDelete(stale);
    const localPending = new Set(await db.trips.where("synced").equals(0).primaryKeys());
    await db.trips.bulkPut(
      snap.openTrips
        .filter((t) => !localPending.has(t.client_uuid) && !pendingRefs.has(t.client_uuid))
        .map((t) => ({ ...t, status: "open" as const, end_odometer: null, ended_on: null, synced: 1 as const })),
    );
  });
}

/** Clears everything on sign-out. Callers confirm first if the outbox isn't empty. */
export async function clearLocalData(): Promise<void> {
  await db.delete();
  await db.open();
}

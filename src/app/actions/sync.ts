"use server";

import { z } from "zod";
import type { ErrorCode } from "@/lib/errors";
import { getAuthUser } from "@/lib/owner";
import { createClient } from "@/lib/supabase/server";
import { closeTripWire, expenseWire, paymentWire, tripWire } from "@/lib/trip-schemas";

/**
 * The server half of offline sync. Every write is idempotent on the phone-minted client_uuid
 * (INSERT … ON CONFLICT (client_uuid) DO NOTHING), so a retry after a lost reply, a killed
 * browser or a double tap can never create a second row.
 *
 *   ok: true                 → the phone deletes the outbox entry
 *   ok: false, retry: true   → transient (network, session, parent not synced yet): try later
 *   ok: false, retry: false  → the data itself was rejected: shown to the owner, not retried
 */
export type PushResult = { ok: true } | { ok: false; retry: boolean; error: ErrorCode };

type DbError = { code?: string; message: string } | null;
function classify(error: DbError): PushResult {
  if (!error) return { ok: true };
  // 22xxx bad data, 23xxx constraint (incl. RLS-rejected FK targets), 42501 RLS refusal.
  if (error.code?.startsWith("22") || error.code?.startsWith("23") || error.code === "42501") {
    return { ok: false, retry: false, error: error.code === "23503" ? "syncRejectedMissing" : "syncRejected" };
  }
  return { ok: false, retry: true, error: "generic" };
}

const SIGNED_OUT: PushResult = { ok: false, retry: true, error: "signedOut" };

export type Snapshot = {
  userId: string;
  vehicles: { id: string; reg_number: string; nickname: string | null; last_odometer: number | null }[];
  drivers: { id: string; name: string }[];
  parties: { id: string; name: string; place: string | null }[];
  openTrips: {
    client_uuid: string;
    vehicle_id: string;
    driver_id: string | null;
    party_id: string;
    from_place: string;
    to_place: string;
    goods: string | null;
    freight_amount: number;
    advance_from_party: number;
    start_odometer: number;
    started_on: string;
  }[];
};

/** Everything the phone needs to keep working offline. */
export async function pullSnapshot(): Promise<Snapshot | null> {
  const user = await getAuthUser();
  if (!user) return null;
  const supabase = await createClient();
  const [vehicles, odometers, drivers, parties, trips] = await Promise.all([
    supabase.from("vehicles").select("id, reg_number, nickname").eq("is_active", true).order("created_at").order("reg_number"),
    supabase.from("vehicle_odometer").select("vehicle_id, last_odometer"),
    supabase.from("drivers").select("id, name").eq("is_active", true).order("name"),
    supabase.from("parties").select("id, name, place").order("name"),
    supabase
      .from("trips")
      .select("client_uuid, vehicle_id, driver_id, party_id, from_place, to_place, goods, freight_amount, advance_from_party, start_odometer, started_on")
      .eq("status", "open")
      .order("started_on", { ascending: false }),
  ]);
  const failed = [vehicles, odometers, drivers, parties, trips].find((r) => r.error);
  if (failed?.error) throw new Error(failed.error.message);

  const lastOdo = new Map((odometers.data ?? []).map((o) => [o.vehicle_id, o.last_odometer]));
  return {
    userId: user.id,
    vehicles: (vehicles.data ?? []).map((v) => ({ ...v, last_odometer: lastOdo.get(v.id) ?? null })),
    drivers: drivers.data ?? [],
    parties: parties.data ?? [],
    openTrips: (trips.data ?? []).map((t) => ({ ...t, start_odometer: t.start_odometer ?? 0 })),
  };
}

export async function pushTrip(input: unknown): Promise<PushResult> {
  const parsed = tripWire.safeParse(input);
  if (!parsed.success) return { ok: false, retry: false, error: "syncRejected" };
  if (!(await getAuthUser())) return SIGNED_OUT;

  const supabase = await createClient();
  const { error } = await supabase
    .from("trips")
    .upsert(parsed.data, { onConflict: "client_uuid", ignoreDuplicates: true });
  return classify(error);
}

/** FormData because a bunk-slip photo may ride along with the expense. */
export async function pushExpense(formData: FormData): Promise<PushResult> {
  const raw = formData.get("expense");
  const parsed = expenseWire.safeParse(typeof raw === "string" ? JSON.parse(raw) : null);
  if (!parsed.success) return { ok: false, retry: false, error: "syncRejected" };
  const user = await getAuthUser();
  if (!user) return SIGNED_OUT;
  const { trip_client_uuid, ...expense } = parsed.data;

  const supabase = await createClient();
  const { data: trip, error: tripError } = await supabase
    .from("trips")
    .select("id")
    .eq("client_uuid", trip_client_uuid)
    .maybeSingle();
  if (tripError) return classify(tripError);
  // The trip is queued ahead of its expenses, so a missing trip means it hasn't landed yet.
  if (!trip) return { ok: false, retry: true, error: "generic" };

  let photo_url: string | null = null;
  const photo = formData.get("photo");
  if (photo instanceof File && photo.size > 0) {
    if (photo.size > 2_000_000 || !photo.type.startsWith("image/")) return { ok: false, retry: false, error: "photoInvalid" };
    photo_url = `${user.id}/${expense.client_uuid}.jpg`;
    // upsert: a retried upload overwrites the same object instead of failing or duplicating.
    const { error: upErr } = await supabase.storage.from("slips").upload(photo_url, photo, { contentType: photo.type, upsert: true });
    if (upErr) return { ok: false, retry: true, error: "generic" };
  }

  const { error } = await supabase
    .from("trip_expenses")
    .upsert({ ...expense, trip_id: trip.id, photo_url, entered_by_user_id: user.id }, { onConflict: "client_uuid", ignoreDuplicates: true });
  return classify(error);
}

export async function pushCloseTrip(input: unknown): Promise<PushResult> {
  const parsed = closeTripWire.safeParse(input);
  if (!parsed.success) return { ok: false, retry: false, error: "syncRejected" };
  if (!(await getAuthUser())) return SIGNED_OUT;
  const { trip_client_uuid, end_odometer, ended_on } = parsed.data;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("trips")
    .update({ status: "closed", end_odometer, ended_on })
    .eq("client_uuid", trip_client_uuid)
    .select("id");
  if (error) return classify(error);
  if (!data.length) return { ok: false, retry: true, error: "generic" }; // trip not synced yet
  return { ok: true };
}

export async function pushPayment(input: unknown): Promise<PushResult> {
  const parsed = paymentWire.safeParse(input);
  if (!parsed.success) return { ok: false, retry: false, error: "syncRejected" };
  if (!(await getAuthUser())) return SIGNED_OUT;
  const supabase = await createClient();
  const { error } = await supabase.from("payments").upsert(parsed.data, { onConflict: "client_uuid", ignoreDuplicates: true });
  return classify(error);
}

/** Short-lived links to view a bunk-slip photo. */
export async function slipPhotoUrl(path: string): Promise<string | null> {
  const safe = z.string().regex(/^[0-9a-f-]{36}\/[0-9a-f-]{36}\.jpg$/).safeParse(path);
  if (!safe.success) return null;
  const supabase = await createClient();
  const { data } = await supabase.storage.from("slips").createSignedUrl(safe.data, 300);
  return data?.signedUrl ?? null;
}

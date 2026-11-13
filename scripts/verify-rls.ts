/**
 * Verifies Row Level Security by behaviour, not by reading policies.
 *
 * Signs in three real phone-OTP accounts through Supabase Auth + PostgREST:
 *   owner A — creates vehicles, a driver, a party, trips, expenses, a payment
 *   owner B — a second owner who must see and touch none of A's data
 *   driver  — A's driver, who may only read/insert expenses on their own open trip
 *             and must never see freight, payments, or anything with profit in it
 *
 * Runs against local Supabase by default. To run against a hosted project, configure
 * three test phone numbers + fixed OTP in Auth → Providers → Phone and set the env vars
 * below. The secret key is used only to delete the three test users before and after.
 *
 *   npm run verify:rls
 */
import { randomUUID } from "node:crypto";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../src/lib/database.types";

type Client = SupabaseClient<Database>;

function env(name: string, fallback?: string): string {
  const value = process.env[name] ?? fallback;
  if (!value) throw new Error(`Missing env ${name}`);
  return value;
}

const URL = env("SUPABASE_URL", "http://127.0.0.1:54321");
const PUBLISHABLE = env("SUPABASE_PUBLISHABLE_KEY");
const SECRET = env("SUPABASE_SECRET_KEY");
const OTP = env("RLS_TEST_OTP", "123456");
const PHONE = {
  ownerA: env("RLS_TEST_PHONE_OWNER_A", "919000000001"),
  ownerB: env("RLS_TEST_PHONE_OWNER_B", "919000000002"),
  driver: env("RLS_TEST_PHONE_DRIVER", "919000000003"),
};

const results: { name: string; ok: boolean; detail?: string }[] = [];
function check(name: string, ok: boolean, detail?: string): void {
  results.push({ name, ok, detail });
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${!ok && detail ? `  — ${detail}` : ""}`);
}

function must<R extends { data: unknown; error: { message: string } | null }>(label: string, res: R): NonNullable<R["data"]> {
  if (res.error || res.data === null || res.data === undefined) {
    throw new Error(`${label}: ${res.error?.message ?? "no data"}`);
  }
  return res.data as NonNullable<R["data"]>;
}

const admin = createClient<Database>(URL, SECRET, {
  auth: { persistSession: false, autoRefreshToken: false },
});

async function deleteTestUsers(): Promise<void> {
  const wanted = new Set(Object.values(PHONE));
  const { data, error } = await admin.auth.admin.listUsers({ perPage: 1000 });
  if (error) throw error;
  for (const user of data.users) {
    if (user.phone && wanted.has(user.phone)) {
      const del = await admin.auth.admin.deleteUser(user.id);
      if (del.error) throw new Error(`cleanup ${user.phone}: ${del.error.message}`);
    }
  }
}

async function signIn(phone: string): Promise<{ db: Client; userId: string }> {
  const db = createClient<Database>(URL, PUBLISHABLE, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const sent = await db.auth.signInWithOtp({ phone: `+${phone}` });
  if (sent.error) throw new Error(`OTP send ${phone}: ${sent.error.message}`);
  const verified = await db.auth.verifyOtp({ phone: `+${phone}`, token: OTP, type: "sms" });
  const userId = verified.data.user?.id;
  if (verified.error || !userId) throw new Error(`OTP verify ${phone}: ${verified.error?.message}`);
  return { db, userId };
}

type TableName = keyof Database["public"]["Tables"];
type ViewName = keyof Database["public"]["Views"];
const TABLES: TableName[] = ["owners", "vehicles", "vehicle_documents", "drivers", "parties", "trips", "trip_expenses", "payments"];
const VIEWS: ViewName[] = ["trip_summary", "vehicle_mileage", "party_outstanding", "owner_dashboard", "vehicle_odometer", "party_ledger", "vehicle_trip_mileage", "monthly_report", "document_alerts"];
const ALL_READABLE: (TableName | ViewName)[] = [...TABLES, ...VIEWS];

const isView = (rel: TableName | ViewName): rel is ViewName => (VIEWS as string[]).includes(rel);

async function rowCount(db: Client, rel: TableName | ViewName): Promise<number | string> {
  const { data, error } = isView(rel) ? await db.from(rel).select("*") : await db.from(rel).select("*");
  if (error) return `error: ${error.message}`;
  return data.length;
}

async function main(): Promise<void> {
  await deleteTestUsers();

  // ---------------------------------------------------------------- owner A sets up
  const a = await signIn(PHONE.ownerA);
  must(
    "A onboard",
    await a.db
      .from("owners")
      .insert({ id: a.userId, name: "முருகன்", business_name: "ஸ்ரீ முருகன் டிரான்ஸ்போர்ட்", phone: PHONE.ownerA })
      .select()
      .single(),
  );
  const [v1, v2] = must(
    "A vehicles",
    await a.db
      .from("vehicles")
      .insert([
        { reg_number: "TN39AB1234", nickname: "பெரிய வண்டி" },
        { reg_number: "TN39CD5678", nickname: "சின்ன வண்டி" },
      ])
      .select(),
  );
  if (!v1 || !v2) throw new Error("expected two vehicles");
  const driver = must(
    "A driver",
    await a.db.from("drivers").insert({ name: "செல்வம்", phone: PHONE.driver }).select().single(),
  );
  const party = must(
    "A party",
    await a.db
      .from("parties")
      .insert({ name: "கணேஷ் டெக்ஸ்டைல்ஸ்", place: "திருப்பூர்", opening_balance: 5000 })
      .select()
      .single(),
  );
  const openTrip = must(
    "A open trip",
    await a.db
      .from("trips")
      .insert({
        client_uuid: randomUUID(),
        vehicle_id: v1.id,
        driver_id: driver.id,
        party_id: party.id,
        from_place: "திருப்பூர்",
        to_place: "சென்னை",
        goods: "துணி",
        freight_amount: 25000,
        advance_from_party: 5000,
        start_odometer: 120000,
      })
      .select()
      .single(),
  );
  const closedTrip = must(
    "A closed trip",
    await a.db
      .from("trips")
      .insert({
        client_uuid: randomUUID(),
        vehicle_id: v2.id,
        driver_id: driver.id,
        party_id: party.id,
        from_place: "சென்னை",
        to_place: "மதுரை",
        freight_amount: 18000,
        start_odometer: 50000,
      })
      .select()
      .single(),
  );
  must(
    "A expenses on closed trip",
    await a.db
      .from("trip_expenses")
      .insert([
        { client_uuid: randomUUID(), trip_id: closedTrip.id, kind: "diesel", amount: 9000, litres: 100, odometer: 50000 },
        { client_uuid: randomUUID(), trip_id: closedTrip.id, kind: "toll", amount: 1200 },
      ])
      .select(),
  );
  must(
    "A closes trip",
    await a.db
      .from("trips")
      .update({ status: "closed", end_odometer: 50460, ended_on: closedTrip.started_on })
      .eq("id", closedTrip.id)
      .select()
      .single(),
  );
  must(
    "A payment",
    await a.db
      .from("payments")
      .insert({ client_uuid: randomUUID(), party_id: party.id, trip_id: closedTrip.id, amount: 10000, mode: "upi" })
      .select()
      .single(),
  );

  // Derived numbers come out of the views as expected.
  const summary = must(
    "A trip_summary",
    await a.db.from("trip_summary").select("*").eq("trip_id", closedTrip.id).single(),
  );
  check("trip_summary: profit = 18000 − 10200 = 7800", Number(summary.profit) === 7800, String(summary.profit));
  check("trip_summary: distance 460 km, mileage 4.6 km/l", summary.distance_km === 460 && Number(summary.mileage_kmpl) === 4.6,
    `${summary.distance_km} km, ${summary.mileage_kmpl}`);
  const owed = must(
    "A party_outstanding",
    await a.db.from("party_outstanding").select("*").eq("party_id", party.id).single(),
  );
  check("party_outstanding: 5000 + 18000 − 0 − 10000 = 13000 (open trip not billed yet)",
    Number(owed.outstanding) === 13000, String(owed.outstanding));

  const ledger = must("A party_ledger", await a.db.from("party_ledger").select("kind, debit, credit, balance, seq").eq("party_id", party.id).order("seq"));
  check("party_ledger: opening → trip → payment, running balance 5000 → 23000 → 13000",
    JSON.stringify(ledger.map((l) => [l.kind, Number(l.balance)])) === JSON.stringify([["opening", 5000], ["trip", 23000], ["payment", 13000]]),
    JSON.stringify(ledger));
  check("party_ledger: last balance equals party_outstanding", Number(ledger.at(-1)?.balance) === Number(owed.outstanding));

  // Idempotent sync: the same client_uuid twice yields one row.
  const dupeUuid = randomUUID();
  const firstSend = { client_uuid: dupeUuid, trip_id: openTrip.id, kind: "toll" as const, amount: 300 };
  await a.db.from("trip_expenses").upsert(firstSend, { onConflict: "client_uuid", ignoreDuplicates: true });
  await a.db.from("trip_expenses").upsert(firstSend, { onConflict: "client_uuid", ignoreDuplicates: true });
  const dupes = must("dupe count", await a.db.from("trip_expenses").select("id").eq("client_uuid", dupeUuid));
  check("same client_uuid sent twice → exactly one row", dupes.length === 1, `${dupes.length} rows`);

  // ---------------------------------------------------------------- owner B sees nothing of A
  const b = await signIn(PHONE.ownerB);
  must(
    "B onboard",
    await b.db
      .from("owners")
      .insert({ id: b.userId, name: "B", business_name: "B Transport", phone: PHONE.ownerB })
      .select()
      .single(),
  );
  for (const rel of ALL_READABLE) {
    const n = await rowCount(b.db, rel);
    const expected = rel === "owners" || rel === "owner_dashboard" ? 1 : 0; // only B's own row
    check(`owner B: ${rel} shows ${expected} row(s), none of A's`, n === expected, String(n));
  }
  const bSelf = must("B owners", await b.db.from("owners").select("id"));
  check("owner B: the one owners row is B's own", bSelf.length === 1 && bSelf[0]?.id === b.userId);

  const bUpd = await b.db.from("vehicles").update({ nickname: "hacked" }).eq("id", v1.id).select();
  check("owner B: cannot update A's vehicle", (bUpd.data?.length ?? 0) === 0);
  const bDel = await b.db.from("parties").delete().eq("id", party.id).select();
  check("owner B: cannot delete A's party", (bDel.data?.length ?? 0) === 0);
  const bFreight = await b.db.from("trips").update({ freight_amount: 1 }).eq("id", openTrip.id).select();
  check("owner B: cannot change A's freight", (bFreight.data?.length ?? 0) === 0);
  const bAsA = await b.db.from("vehicles").insert({ owner_id: a.userId, reg_number: "TN01ZZ0001" }).select();
  check("owner B: cannot insert a vehicle as A", bAsA.error !== null);
  const bParty = must("B party", await b.db.from("parties").insert({ name: "B party" }).select().single());
  const bTrip = await b.db
    .from("trips")
    .insert({ client_uuid: randomUUID(), vehicle_id: v1.id, party_id: bParty.id, from_place: "x", to_place: "y", freight_amount: 1 })
    .select();
  check("owner B: cannot put A's vehicle on B's trip (composite FK)", bTrip.error !== null);
  const bExp = await b.db
    .from("trip_expenses")
    .insert({ client_uuid: randomUUID(), trip_id: openTrip.id, kind: "toll", amount: 1 })
    .select();
  check("owner B: cannot add an expense to A's trip", bExp.error !== null);
  const bPay = await b.db
    .from("payments")
    .insert({ client_uuid: randomUUID(), party_id: party.id, amount: 1, mode: "cash" })
    .select();
  check("owner B: cannot record a payment against A's party", bPay.error !== null);
  const bDriverTrips = must("B rpc", await b.db.rpc("driver_open_trips"));
  check("owner B: driver_open_trips is empty", bDriverTrips.length === 0);

  // ---------------------------------------------------------------- A's driver
  const d = await signIn(PHONE.driver);
  for (const rel of ALL_READABLE) {
    if (rel === "trip_expenses") continue; // checked separately below
    const n = await rowCount(d.db, rel);
    check(`driver: ${rel} shows 0 rows`, n === 0, String(n));
  }
  const dFreight = await d.db.from("trips").select("freight_amount").eq("id", openTrip.id);
  check("driver: freight_amount of own open trip is unreadable", (dFreight.data?.length ?? 0) === 0);
  const dProfit = await d.db.from("trip_summary").select("profit, freight_amount").eq("trip_id", openTrip.id);
  check("driver: profit/freight via trip_summary is unreadable", (dProfit.data?.length ?? 0) === 0);

  const myTrips = must("driver rpc", await d.db.rpc("driver_open_trips"));
  check("driver: sees exactly one open trip via driver_open_trips()", myTrips.length === 1 && myTrips[0]?.trip_id === openTrip.id);
  const leakedKeys = Object.keys(myTrips[0] ?? {}).filter((k) => /freight|advance|party|profit|amount/.test(k));
  check("driver: driver_open_trips() returns no money or party columns", leakedKeys.length === 0, leakedKeys.join(","));

  const dIns = await d.db
    .from("trip_expenses")
    .insert({ client_uuid: randomUUID(), trip_id: openTrip.id, kind: "diesel", amount: 4500, litres: 50, odometer: 120300, entered_by_user_id: d.userId })
    .select()
    .single();
  check("driver: can add diesel to own open trip", dIns.error === null, dIns.error?.message);
  const dSeen = must("driver expenses", await d.db.from("trip_expenses").select("trip_id"));
  check("driver: reads expenses of own open trip only", dSeen.length > 0 && dSeen.every((r) => r.trip_id === openTrip.id), `${dSeen.length} rows`);
  const dClosed = await d.db
    .from("trip_expenses")
    .insert({ client_uuid: randomUUID(), trip_id: closedTrip.id, kind: "toll", amount: 1, entered_by_user_id: d.userId })
    .select();
  check("driver: cannot add to a closed trip", dClosed.error !== null);
  const dSpoof = await d.db
    .from("trip_expenses")
    .insert({ client_uuid: randomUUID(), trip_id: openTrip.id, kind: "toll", amount: 1, entered_by_user_id: a.userId })
    .select();
  check("driver: cannot enter an expense as someone else", dSpoof.error !== null);
  if (dIns.data) {
    const dUpd = await d.db.from("trip_expenses").update({ amount: 1 }).eq("id", dIns.data.id).select();
    check("driver: cannot edit an expense after saving", (dUpd.data?.length ?? 0) === 0);
    const dDel = await d.db.from("trip_expenses").delete().eq("id", dIns.data.id).select();
    check("driver: cannot delete an expense", (dDel.data?.length ?? 0) === 0);
  }

  const aSeesDriver = must("A sees driver entry", await a.db.from("trip_expenses").select("id").eq("entered_by_user_id", d.userId));
  check("owner A: sees the driver's diesel entry", aSeesDriver.length === 1);

  // Once the trip closes the driver loses access to it entirely.
  must(
    "A closes open trip",
    await a.db
      .from("trips")
      .update({ status: "closed", end_odometer: 120900, ended_on: openTrip.started_on })
      .eq("id", openTrip.id)
      .select()
      .single(),
  );
  const afterClose = must("driver after close", await d.db.from("trip_expenses").select("id"));
  check("driver: after close, sees no expenses", afterClose.length === 0, String(afterClose.length));
  const tripsAfter = must("driver rpc after close", await d.db.rpc("driver_open_trips"));
  check("driver: after close, no open trips", tripsAfter.length === 0);

  // ---------------------------------------------------------------- photos (Storage RLS)
  const slipPath = `${a.userId}/${randomUUID()}.jpg`;
  const jpeg = new Blob([new Uint8Array([0xff, 0xd8, 0xff, 0xd9])], { type: "image/jpeg" });
  const up = await a.db.storage.from("slips").upload(slipPath, jpeg, { contentType: "image/jpeg" });
  check("owner A: uploads a slip photo into own folder", up.error === null, up.error?.message);
  const aGet = await a.db.storage.from("slips").download(slipPath);
  check("owner A: can read own slip photo", aGet.error === null, aGet.error?.message);
  const bGet = await b.db.storage.from("slips").download(slipPath);
  check("owner B: cannot read A's slip photo", bGet.error !== null);
  const bPut = await b.db.storage.from("slips").upload(`${a.userId}/planted.jpg`, jpeg, { contentType: "image/jpeg" });
  check("owner B: cannot write into A's photo folder", bPut.error !== null);
  const bList = await b.db.storage.from("slips").list(a.userId);
  check("owner B: cannot list A's photos", (bList.data?.length ?? 0) === 0);
  const dGet = await d.db.storage.from("slips").download(slipPath);
  check("driver: cannot read the owner's slip photos", dGet.error !== null);
  const docPut = await b.db.storage.from("vehicle-docs").upload(`${a.userId}/${v1.id}/fc.jpg`, jpeg, { contentType: "image/jpeg" });
  check("owner B: cannot write A's vehicle documents", docPut.error !== null);

  // ---------------------------------------------------------------- signed out
  const anon = createClient<Database>(URL, PUBLISHABLE, { auth: { persistSession: false } });
  const anonGet = await anon.storage.from("slips").download(slipPath);
  check("signed out: slip photo not readable", anonGet.error !== null);
  for (const rel of ["vehicles", "trips", "payments", "trip_summary"] as const) {
    const n = await rowCount(anon, rel);
    check(`signed out: ${rel} not readable`, n === 0 || typeof n === "string", String(n));
  }

  await admin.storage.from("slips").remove([slipPath]);
  await deleteTestUsers();

  const failed = results.filter((r) => !r.ok);
  console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
  if (failed.length > 0) process.exit(1);
}

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});

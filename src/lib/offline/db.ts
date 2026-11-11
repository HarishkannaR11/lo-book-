/**
 * The phone's own copy of what it needs to work with no signal, plus the outbox.
 *
 * Masters and open trips are a read-only mirror of the server, refreshed on every sync.
 * Rows the owner creates here carry synced = 0 until the server confirms them; the outbox
 * holds one entry per pending write, in the order they were made.
 */
import Dexie, { type EntityTable } from "dexie";
import type { ExpenseKind } from "@/lib/trip-schemas";

export type LocalVehicle = { id: string; reg_number: string; nickname: string | null; last_odometer: number | null };
export type LocalDriver = { id: string; name: string };
export type LocalParty = { id: string; name: string; place: string | null };

export type LocalTrip = {
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
  status: "open" | "closed";
  end_odometer: number | null;
  ended_on: string | null;
  synced: 0 | 1;
};

export type LocalExpense = {
  client_uuid: string;
  trip_client_uuid: string;
  kind: ExpenseKind;
  amount: number;
  litres: number | null;
  odometer: number | null;
  spent_on: string;
  photo: Blob | null;
  created_at: number;
};

export type OutboxItem = {
  seq?: number;
  type: "trip" | "expense" | "closeTrip";
  ref: string; // client_uuid of the trip or expense
  created_at: number;
  attempts: number;
  error: string | null;
  failed: 0 | 1; // 1 = the server rejected it for good; shown to the owner, never retried
};

class LorryDB extends Dexie {
  vehicles!: EntityTable<LocalVehicle, "id">;
  drivers!: EntityTable<LocalDriver, "id">;
  parties!: EntityTable<LocalParty, "id">;
  trips!: EntityTable<LocalTrip, "client_uuid">;
  expenses!: EntityTable<LocalExpense, "client_uuid">;
  outbox!: EntityTable<OutboxItem, "seq">;
  meta!: EntityTable<{ key: string; value: string }, "key">;

  constructor() {
    super("lorry-book");
    this.version(1).stores({
      vehicles: "id",
      drivers: "id",
      parties: "id",
      trips: "client_uuid, vehicle_id, status, synced",
      expenses: "client_uuid, trip_client_uuid",
      outbox: "++seq, ref, failed",
      meta: "key",
    });
  }
}

export const db = new LorryDB();

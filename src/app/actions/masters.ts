"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { fieldError, formError, parseForm, type FormState } from "@/lib/form";
import { createClient } from "@/lib/supabase/server";
import {
  checkbox,
  indianMobile,
  optionalIndianMobile,
  optionalText,
  optionalUuid,
  regNumber,
  requiredText,
  rupees,
  uuid,
} from "@/lib/validation";

type DbError = { code?: string; message: string } | null;
const isUniqueViolation = (e: DbError, constraint: string) => e?.code === "23505" && e.message.includes(constraint);
const isForeignKeyViolation = (e: DbError) => e?.code === "23503";

function refresh(...paths: string[]) {
  revalidatePath("/settings");
  for (const path of paths) revalidatePath(path);
}

// ---------------------------------------------------------------- vehicles

const vehicleSchema = z.object({
  id: optionalUuid,
  reg_number: regNumber,
  nickname: optionalText(40),
  is_active: checkbox,
});
export type VehicleField = keyof z.input<typeof vehicleSchema>;

export async function saveVehicle(_prev: FormState<VehicleField>, formData: FormData): Promise<FormState<VehicleField>> {
  const parsed = parseForm(vehicleSchema, formData);
  if (!parsed.ok) return parsed.state;
  const { id, reg_number, nickname, is_active } = parsed.data;
  const supabase = await createClient();

  const { error } = id
    ? await supabase.from("vehicles").update({ reg_number, nickname, is_active }).eq("id", id).select("id").single()
    : await supabase.from("vehicles").insert({ reg_number, nickname }).select("id").single();

  if (isUniqueViolation(error, "vehicles_owner_id_reg_number_key")) {
    return fieldError<VehicleField>("reg_number", "regDuplicate", formData);
  }
  if (error) return formError("generic", formData);

  refresh("/settings/vehicles", "/onboarding/vehicles");
  if (id) redirect("/settings/vehicles");
  return { status: "ok", at: Date.now(), label: reg_number };
}

// ---------------------------------------------------------------- drivers

const driverSchema = z.object({
  id: optionalUuid,
  name: requiredText(80),
  phone: indianMobile,
  licence_number: optionalText(30),
  is_active: checkbox,
});
export type DriverField = keyof z.input<typeof driverSchema>;

export async function saveDriver(_prev: FormState<DriverField>, formData: FormData): Promise<FormState<DriverField>> {
  const parsed = parseForm(driverSchema, formData);
  if (!parsed.ok) return parsed.state;
  const { id, name, phone, licence_number, is_active } = parsed.data;
  const supabase = await createClient();

  const { error } = id
    ? await supabase.from("drivers").update({ name, phone, licence_number, is_active }).eq("id", id).select("id").single()
    : await supabase.from("drivers").insert({ name, phone, licence_number }).select("id").single();

  if (isUniqueViolation(error, "drivers_owner_id_phone_key")) {
    return fieldError<DriverField>("phone", "driverPhoneDuplicate", formData);
  }
  if (error) return formError("generic", formData);

  refresh("/settings/drivers", "/onboarding/drivers");
  if (id) redirect("/settings/drivers");
  return { status: "ok", at: Date.now(), label: name };
}

// ---------------------------------------------------------------- parties

const partySchema = z.object({
  id: optionalUuid,
  name: requiredText(120),
  phone: optionalIndianMobile,
  place: optionalText(80),
  opening_balance: rupees,
});
export type PartyField = keyof z.input<typeof partySchema>;

export async function saveParty(_prev: FormState<PartyField>, formData: FormData): Promise<FormState<PartyField>> {
  const parsed = parseForm(partySchema, formData);
  if (!parsed.ok) return parsed.state;
  const { id, ...fields } = parsed.data;
  const supabase = await createClient();

  const { error } = id
    ? await supabase.from("parties").update(fields).eq("id", id).select("id").single()
    : await supabase.from("parties").insert(fields).select("id").single();
  if (error) return formError("generic", formData);

  refresh("/settings/parties", "/onboarding/parties");
  if (id) redirect("/settings/parties");
  return { status: "ok", at: Date.now(), label: fields.name };
}

// ---------------------------------------------------------------- delete (only when unused)

export type DeleteState = { status: "idle" } | { status: "error"; error: "inUse" | "partyInUse" | "generic" };

const deleteSchema = z.object({ id: uuid });
const deletable = { vehicles: "/settings/vehicles", drivers: "/settings/drivers", parties: "/settings/parties" } as const;

async function deleteRow(table: keyof typeof deletable, formData: FormData): Promise<DeleteState> {
  const parsed = deleteSchema.safeParse({ id: formData.get("id") });
  if (!parsed.success) return { status: "error", error: "generic" };

  const supabase = await createClient();
  const { error } = await supabase.from(table).delete().eq("id", parsed.data.id);
  if (isForeignKeyViolation(error)) return { status: "error", error: table === "parties" ? "partyInUse" : "inUse" };
  if (error) return { status: "error", error: "generic" };

  refresh(deletable[table]);
  redirect(deletable[table]);
}

export async function deleteVehicle(_prev: DeleteState, formData: FormData) {
  return deleteRow("vehicles", formData);
}
export async function deleteDriver(_prev: DeleteState, formData: FormData) {
  return deleteRow("drivers", formData);
}
export async function deleteParty(_prev: DeleteState, formData: FormData) {
  return deleteRow("parties", formData);
}

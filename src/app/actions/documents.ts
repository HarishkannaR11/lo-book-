"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { DOC_TYPES } from "@/lib/documents";
import type { ErrorCode } from "@/lib/errors";
import { getAuthUser } from "@/lib/owner";
import { createClient } from "@/lib/supabase/server";


const docSchema = z.object({
  vehicle_id: z.uuid(),
  doc_type: z.enum(DOC_TYPES),
  expires_on: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, { error: "dateInvalid" }),
});

export type DocState = { status: "idle" } | { status: "error"; error: ErrorCode };

export async function saveDocument(_prev: DocState, formData: FormData): Promise<DocState> {
  const parsed = docSchema.safeParse({
    vehicle_id: formData.get("vehicle_id"),
    doc_type: formData.get("doc_type"),
    expires_on: formData.get("expires_on"),
  });
  if (!parsed.success) return { status: "error", error: formData.get("expires_on") ? "dateInvalid" : "required" };
  const user = await getAuthUser();
  if (!user) redirect("/login");
  const { vehicle_id, doc_type, expires_on } = parsed.data;
  const supabase = await createClient();

  // RLS: only the owner's vehicles are visible, so this also proves ownership.
  const { data: vehicle } = await supabase.from("vehicles").select("id").eq("id", vehicle_id).maybeSingle();
  if (!vehicle) return { status: "error", error: "generic" };

  let file_url: string | undefined;
  const photo = formData.get("photo");
  if (photo instanceof File && photo.size > 0) {
    if (photo.size > 4_000_000 || !photo.type.startsWith("image/")) return { status: "error", error: "photoInvalid" };
    file_url = `${user.id}/${vehicle_id}/${doc_type}.jpg`;
    const { error } = await supabase.storage.from("vehicle-docs").upload(file_url, photo, { contentType: photo.type, upsert: true });
    if (error) return { status: "error", error: "generic" };
  }

  const { error } = await supabase
    .from("vehicle_documents")
    .upsert({ vehicle_id, doc_type, expires_on, ...(file_url ? { file_url } : {}) }, { onConflict: "vehicle_id,doc_type" });
  if (error) return { status: "error", error: "generic" };

  revalidatePath(`/vehicles/${vehicle_id}`);
  revalidatePath("/vehicles");
  redirect(`/vehicles/${vehicle_id}`);
}

export async function documentPhotoUrl(vehicleId: string, docType: string): Promise<string | null> {
  const parsed = docSchema.pick({ vehicle_id: true, doc_type: true }).safeParse({ vehicle_id: vehicleId, doc_type: docType });
  if (!parsed.success) return null;
  const supabase = await createClient();
  const { data: doc } = await supabase
    .from("vehicle_documents")
    .select("file_url")
    .eq("vehicle_id", parsed.data.vehicle_id)
    .eq("doc_type", parsed.data.doc_type)
    .maybeSingle();
  if (!doc?.file_url) return null;
  const { data } = await supabase.storage.from("vehicle-docs").createSignedUrl(doc.file_url, 300);
  return data?.signedUrl ?? null;
}

import "server-only";
import { redirect } from "next/navigation";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";

/** The signed-in user's id and verified phone, or null. Validates the JWT. */
export const getAuthUser = cache(async () => {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;
  if (!claims?.sub) return null;
  return { id: claims.sub, phone: typeof claims.phone === "string" ? claims.phone : "" };
});

/** The owner row for the signed-in user (RLS returns only their own), or null. */
export const getOwner = cache(async () => {
  const supabase = await createClient();
  const { data, error } = await supabase.from("owners").select("*").maybeSingle();
  if (error) throw new Error(error.message);
  return data;
});

export async function requireOwner() {
  const owner = await getOwner();
  if (!owner) redirect("/onboarding");
  return owner;
}

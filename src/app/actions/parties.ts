"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

/** Undo a mistaken payment. Online only; the ledger recomputes from the view. */
export async function deletePayment(paymentId: string, partyId: string): Promise<{ ok: boolean }> {
  const ids = z.object({ paymentId: z.uuid(), partyId: z.uuid() }).safeParse({ paymentId, partyId });
  if (!ids.success) return { ok: false };
  const supabase = await createClient();
  const { data, error } = await supabase.from("payments").delete().eq("id", ids.data.paymentId).select("id");
  if (error || data.length !== 1) return { ok: false };
  revalidatePath(`/parties/${ids.data.partyId}`);
  revalidatePath("/parties");
  revalidatePath("/");
  return { ok: true };
}

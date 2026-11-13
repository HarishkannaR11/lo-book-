"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import type { ErrorCode } from "@/lib/errors";
import { getAuthUser } from "@/lib/owner";
import { createClient } from "@/lib/supabase/server";

export type DeleteAccountState = { status: "idle" } | { status: "error"; error: ErrorCode };

const confirmSchema = z.object({ confirm: z.literal("delete") });
const BUCKETS = ["slips", "vehicle-docs"] as const;
type Supabase = Awaited<ReturnType<typeof createClient>>;

/** Every file under `prefix`, walking into folders (vehicle-docs nests one level per vehicle). */
async function listFiles(supabase: Supabase, bucket: string, prefix: string): Promise<string[] | null> {
  const files: string[] = [];
  for (let offset = 0; ; offset += 1000) {
    const { data, error } = await supabase.storage.from(bucket).list(prefix, { limit: 1000, offset });
    if (error) return null;
    for (const item of data) {
      const path = `${prefix}/${item.name}`;
      if (item.id === null) {
        const inner = await listFiles(supabase, bucket, path);
        if (inner === null) return null;
        files.push(...inner);
      } else {
        files.push(path);
      }
    }
    if (data.length < 1000) return files;
  }
}

/**
 * Deletes the signed-in user's account and everything they own (Google Play requires this in
 * the app). Photos go first, through the Storage API as the user (Supabase refuses storage
 * deletes from SQL); then delete_my_account() removes the auth user, which cascades to every
 * row. If a photo can't be removed nothing else is deleted, so the owner can simply retry.
 */
export async function deleteAccount(_prev: DeleteAccountState, formData: FormData): Promise<DeleteAccountState> {
  if (!confirmSchema.safeParse({ confirm: formData.get("confirm") }).success) return { status: "error", error: "generic" };
  const user = await getAuthUser();
  if (!user) redirect("/login");
  const supabase = await createClient();

  for (const bucket of BUCKETS) {
    const files = await listFiles(supabase, bucket, user.id);
    if (files === null) return { status: "error", error: "generic" };
    for (let i = 0; i < files.length; i += 100) {
      const { error } = await supabase.storage.from(bucket).remove(files.slice(i, i + 100));
      if (error) return { status: "error", error: "generic" };
    }
  }

  const { error } = await supabase.rpc("delete_my_account");
  if (error) {
    console.error("delete account failed", { code: error.code, message: error.message });
    return { status: "error", error: "generic" };
  }
  // The user no longer exists, so only the cookies need clearing. The login page then wipes
  // the phone's copy (it can't happen here, and must not happen before the delete succeeds).
  await supabase.auth.signOut({ scope: "local" });
  redirect("/login?deleted=1");
}

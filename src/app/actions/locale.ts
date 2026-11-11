"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { isLocale, LOCALE_COOKIE } from "@/i18n/config";
import { getAuthUser } from "@/lib/owner";
import { createClient } from "@/lib/supabase/server";

export async function setLocale(formData: FormData): Promise<void> {
  const locale = formData.get("locale");
  if (!isLocale(locale)) return;

  (await cookies()).set(LOCALE_COOKIE, locale, { path: "/", maxAge: 60 * 60 * 24 * 365, sameSite: "lax" });

  const user = await getAuthUser();
  if (user) {
    const supabase = await createClient();
    // No-op when the user has not onboarded yet (RLS: no owners row to update).
    await supabase.from("owners").update({ locale }).eq("id", user.id);
  }
  revalidatePath("/", "layout");
}

"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getLocale } from "next-intl/server";
import { formError, parseForm, type FormState } from "@/lib/form";
import { getAuthUser } from "@/lib/owner";
import { createClient } from "@/lib/supabase/server";
import { requiredText } from "@/lib/validation";

const ownerSchema = z.object({
  name: requiredText(80),
  business_name: requiredText(120),
});

export type OwnerField = keyof z.input<typeof ownerSchema>;

/** Creates the owner row on first sign-in (then continues onboarding), or updates it. */
export async function saveOwner(_prev: FormState<OwnerField>, formData: FormData): Promise<FormState<OwnerField>> {
  const parsed = parseForm(ownerSchema, formData);
  if (!parsed.ok) return parsed.state;

  const user = await getAuthUser();
  if (!user) redirect("/login");

  const supabase = await createClient();
  const { data: existing } = await supabase.from("owners").select("id").maybeSingle();

  if (existing) {
    const { error } = await supabase.from("owners").update(parsed.data).eq("id", user.id);
    if (error) return formError("generic", formData);
    revalidatePath("/", "layout");
    return { status: "ok", at: Date.now() };
  }

  const { error } = await supabase.from("owners").insert({
    id: user.id,
    ...parsed.data,
    phone: user.phone, // overwritten from auth.users by a trigger; never trusted from the client
    locale: await getLocale(), // whatever the owner is reading right now
  });
  if (error) return formError("generic", formData);
  redirect("/onboarding/vehicles");
}

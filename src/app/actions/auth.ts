"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { LOCALE_COOKIE } from "@/i18n/config";
import type { ErrorCode } from "@/lib/errors";
import { createClient } from "@/lib/supabase/server";
import { indianMobile, otp } from "@/lib/validation";

export type SendOtpState =
  | { status: "idle" }
  | { status: "sent"; phone: string; sentAt: number }
  | { status: "error"; error: ErrorCode; phoneInput: string };

export type VerifyOtpState = { status: "idle" } | { status: "error"; error: ErrorCode };

function authErrorCode(error: { status?: number; code?: string; message?: string }, fallback: ErrorCode): ErrorCode {
  // The owner sees a plain message; the real reason (provider off, SMS gateway refused, bad
  // key) goes to the server log so it can be fixed. No phone number or OTP is logged.
  console.error("auth error", { status: error.status, code: error.code, message: error.message });
  if (error.status === 429 || error.code?.startsWith("over_")) return "tooManyRequests";
  return fallback;
}

export async function sendOtp(_prev: SendOtpState, formData: FormData): Promise<SendOtpState> {
  const phoneInput = String(formData.get("phone") ?? "");
  const parsed = indianMobile.safeParse(phoneInput);
  if (!parsed.success) {
    return { status: "error", error: parsed.error.issues[0]?.message === "required" ? "required" : "phoneInvalid", phoneInput };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithOtp({ phone: `+${parsed.data}` });
  if (error) return { status: "error", error: authErrorCode(error, "otpSendFailed"), phoneInput };
  return { status: "sent", phone: parsed.data, sentAt: Date.now() };
}

const verifySchema = z.object({ phone: indianMobile, token: otp });

export async function verifyOtp(_prev: VerifyOtpState, formData: FormData): Promise<VerifyOtpState> {
  const parsed = verifySchema.safeParse({ phone: formData.get("phone"), token: formData.get("token") });
  if (!parsed.success) return { status: "error", error: "otpInvalid" };

  const supabase = await createClient();
  const { error } = await supabase.auth.verifyOtp({
    phone: `+${parsed.data.phone}`,
    token: parsed.data.token,
    type: "sms",
  });
  if (error) return { status: "error", error: authErrorCode(error, "otpWrong") };

  // A returning owner on a new phone gets their saved language back.
  const { data: owner } = await supabase.from("owners").select("locale").maybeSingle();
  if (owner) {
    (await cookies()).set(LOCALE_COOKIE, owner.locale, { path: "/", maxAge: 60 * 60 * 24 * 365, sameSite: "lax" });
  }
  redirect(owner ? "/" : "/onboarding");
}

export async function signOut(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

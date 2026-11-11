import { z } from "zod";

export const requiredText = (max: number) =>
  z.string({ error: "required" }).trim().min(1, { error: "required" }).max(max, { error: "tooLong" });

export const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max, { error: "tooLong" })
    .optional()
    .transform((v) => (v ? v : null));

/** "98765 43210", "098765-43210", "+91 98765 43210" → "919876543210" (Supabase Auth's format). */
export function normaliseIndianMobile(input: string): string | null {
  let digits = input.replace(/\D/g, "");
  if (digits.length === 12 && digits.startsWith("91")) digits = digits.slice(2);
  else if (digits.length === 11 && digits.startsWith("0")) digits = digits.slice(1);
  return /^[6-9]\d{9}$/.test(digits) ? `91${digits}` : null;
}

export const indianMobile = z.string({ error: "phoneInvalid" }).transform((value, ctx) => {
  const phone = normaliseIndianMobile(value);
  if (!phone) {
    ctx.addIssue({ code: "custom", message: value.trim() ? "phoneInvalid" : "required" });
    return z.NEVER;
  }
  return phone;
});

export const optionalIndianMobile = z
  .string()
  .optional()
  .transform((value, ctx) => {
    if (!value?.trim()) return null;
    const phone = normaliseIndianMobile(value);
    if (!phone) {
      ctx.addIssue({ code: "custom", message: "phoneInvalid" });
      return z.NEVER;
    }
    return phone;
  });

const REG_STANDARD = /^[A-Z]{2}[0-9]{1,2}[A-Z]{0,3}[0-9]{1,4}$/; // TN 39 AB 1234
const REG_BHARAT = /^[0-9]{2}BH[0-9]{4}[A-Z]{1,2}$/; // 22 BH 1234 AA

/** "tn-39 ab 1234" → "TN39AB1234". Stored without spaces so duplicates are caught. */
export const regNumber = z.string({ error: "required" }).transform((value, ctx) => {
  const reg = value.toUpperCase().replace(/[^A-Z0-9]/g, "");
  if (!reg) {
    ctx.addIssue({ code: "custom", message: "required" });
    return z.NEVER;
  }
  if (!REG_STANDARD.test(reg) && !REG_BHARAT.test(reg)) {
    ctx.addIssue({ code: "custom", message: "regInvalid" });
    return z.NEVER;
  }
  return reg;
});

/** Whole rupees or paise, commas allowed. Blank → 0. */
export const rupees = z
  .string()
  .optional()
  .transform((value, ctx) => {
    const cleaned = (value ?? "").replace(/[,\s₹]/g, "");
    if (cleaned === "") return 0;
    if (!/^\d{1,9}(\.\d{1,2})?$/.test(cleaned)) {
      ctx.addIssue({ code: "custom", message: "amountInvalid" });
      return z.NEVER;
    }
    return Number(cleaned);
  });

export const checkbox = z
  .string()
  .optional()
  .transform((v) => v === "on");

export const uuid = z.uuid();
export const optionalUuid = z
  .union([z.uuid(), z.literal("")])
  .optional()
  .transform((v) => (v ? v : null));

export const otp = z.string().trim().regex(/^\d{6}$/, { error: "otpInvalid" });

import "server-only";
import { z } from "zod";
import en from "../../messages/en.json";
import type { ErrorCode, FormState } from "./errors";

export type { ErrorCode, FormState };

const KNOWN = new Set<string>(Object.keys(en.errors));
export function toErrorCode(message: string | undefined): ErrorCode {
  return message !== undefined && KNOWN.has(message) ? (message as ErrorCode) : "generic";
}

function formValues(formData: FormData): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [key, value] of formData.entries()) {
    if (typeof value === "string" && !key.startsWith("$ACTION")) out[key] = value;
  }
  return out;
}

/** Validates FormData at the server-action boundary. Error messages are ErrorCodes. */
export function parseForm<S extends z.ZodObject>(
  schema: S,
  formData: FormData,
): { ok: true; data: z.output<S> } | { ok: false; state: FormState<Extract<keyof z.input<S>, string>> } {
  const raw = formValues(formData);
  const result = schema.safeParse(raw);
  if (result.success) return { ok: true, data: result.data };

  type F = Extract<keyof z.input<S>, string>;
  const fieldErrors: Partial<Record<F, ErrorCode>> = {};
  for (const issue of result.error.issues) {
    const field = issue.path[0];
    if (typeof field === "string" && !(field in fieldErrors)) {
      fieldErrors[field as F] = toErrorCode(issue.message);
    }
  }
  return { ok: false, state: { status: "error", fieldErrors, values: raw as Partial<Record<F, string>> } };
}

export function formError<F extends string>(code: ErrorCode, formData: FormData): FormState<F> {
  return { status: "error", fieldErrors: {}, formError: code, values: formValues(formData) as Partial<Record<F, string>> };
}

export function fieldError<F extends string>(field: F, code: ErrorCode, formData: FormData): FormState<F> {
  const fieldErrors: Partial<Record<F, ErrorCode>> = {};
  fieldErrors[field] = code;
  return { status: "error", fieldErrors, values: formValues(formData) as Partial<Record<F, string>> };
}

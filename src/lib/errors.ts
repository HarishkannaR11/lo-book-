import type messages from "../../messages/en.json";

/** Every error a form can show is a key in messages/*.json → "errors". */
export type ErrorCode = keyof (typeof messages)["errors"];

/** What a form's server action returns. Shared by server actions and client forms. */
export type FormState<F extends string> =
  | { status: "idle" }
  | {
      status: "error";
      fieldErrors: Partial<Record<F, ErrorCode>>;
      formError?: ErrorCode;
      /** Echoed back so the form keeps what was typed after React resets it. */
      values: Partial<Record<F, string>>;
    }
  | { status: "ok"; at: number; label?: string };

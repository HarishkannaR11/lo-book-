import "server-only";

function required(name: string, value: string | undefined): string {
  if (!value) throw new Error(`Missing environment variable ${name}. See .env.example.`);
  return value;
}

// Server-only on purpose: the app talks to Supabase only from the server (server components,
// server actions, the proxy), so these never need to reach the browser. Without a NEXT_PUBLIC_
// prefix, Next.js will not inline them into browser code even if a client file imports this.
// Keep only the origin: a URL pasted from the dashboard with "/rest/v1/" on the end would
// otherwise turn every request into …/rest/v1/rest/v1/… and fail.
export const SUPABASE_URL = new URL(required("SUPABASE_URL", process.env.SUPABASE_URL)).origin;
export const SUPABASE_PUBLISHABLE_KEY = required("SUPABASE_PUBLISHABLE_KEY", process.env.SUPABASE_PUBLISHABLE_KEY);

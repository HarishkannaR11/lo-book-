import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { Database } from "@/lib/database.types";
import { SUPABASE_PUBLISHABLE_KEY, SUPABASE_URL } from "@/lib/env";

const PUBLIC_PATHS = new Set(["/login", "/offline"]);

/** Refreshes the Supabase session cookie and keeps signed-out visitors on /login. */
export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, headers) {
        for (const { name, value } of cookiesToSet) request.cookies.set(name, value);
        response = NextResponse.next({ request });
        for (const { name, value, options } of cookiesToSet) response.cookies.set(name, value, options);
        for (const [key, value] of Object.entries(headers)) response.headers.set(key, value);
      },
    },
  });

  // getClaims() validates the JWT; do not put code between client creation and this call.
  const { data } = await supabase.auth.getClaims();
  const signedIn = Boolean(data?.claims?.sub);
  const { pathname } = request.nextUrl;

  if (!signedIn && !PUBLIC_PATHS.has(pathname)) {
    return redirectKeepingCookies(request, response, "/login");
  }
  if (signedIn && pathname === "/login") {
    return redirectKeepingCookies(request, response, "/");
  }
  return response;
}

function redirectKeepingCookies(request: NextRequest, from: NextResponse, to: string) {
  const redirect = NextResponse.redirect(new URL(to, request.url));
  for (const cookie of from.cookies.getAll()) redirect.cookies.set(cookie);
  return redirect;
}

export const config = {
  matcher: [
    // Everything except static assets, the PWA files and icons.
    // .well-known (Android app links) and the privacy policy must be readable signed out.
    "/((?!_next/static|_next/image|sw\\.js|manifest\\.webmanifest|icons/|icon\\.svg|apple-icon\\.png|favicon\\.ico|\\.well-known/|privacy\\.html).*)",
  ],
};

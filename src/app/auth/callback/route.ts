/* src/app/auth/callback/route.ts
 * OAuth callback: exchanges the auth code for a session cookie, then sends
 * the user where they originally wanted to go (validated same-origin only).
 */
import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

function safeNext(raw: string | null): string {
  if (raw && raw.startsWith("/") && !raw.startsWith("//")) return raw;
  return "/";
}

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = safeNext(searchParams.get("next"));

  if (!code) {
    return NextResponse.redirect(new URL("/login?error=oauth", origin));
  }

  const response = NextResponse.redirect(new URL(next, origin));
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          // Write session cookies onto the redirect response itself so they
          // survive the round-trip (RSC cookie store is read-only here).
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    console.error("[auth/callback] code exchange failed:", error.message);
    return NextResponse.redirect(new URL("/login?error=oauth", origin));
  }

  return response;
}

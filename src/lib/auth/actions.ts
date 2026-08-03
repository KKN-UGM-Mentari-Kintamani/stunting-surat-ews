"use server";

/* src/lib/auth/actions.ts
 * Supabase Auth server actions.
 *
 * NOTE: PRD §5.1 names Auth.js (NextAuth); we implement Supabase Auth instead
 * because the committed backend (middleware, server.ts, RLS) is built on
 * @supabase/ssr per AGENTS.md. Google OAuth only — no password auth.
 */
import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { siteUrl } from "@/lib/site-url";

/**
 * Resolves the app's base URL for the OAuth redirectTo. Prefers the request's
 * Origin header (works on localhost), falls back to NEXT_PUBLIC_SITE_URL, then
 * to Vercel production URL. This keeps localhost login returning to localhost
 * as long as Supabase's Redirect URLs include it.
 */
async function oauthBaseUrl(): Promise<string> {
  const headerStore = await headers();
  const origin = headerStore.get("origin");
  if (origin) return origin.replace(/\/$/, "");
  return siteUrl();
}

/**
 * Starts the Google OAuth flow. `next` is an internal path the user should
 * land on after the callback (e.g. the protected page middleware bounced
 * them from). Validated to same-origin paths only.
 */
export async function signInWithGoogleAction(next?: string) {
  const supabase = await createClient();
  const baseUrl = await oauthBaseUrl();
  const safeNext = next && next.startsWith("/") && !next.startsWith("//")
    ? next
    : "/";

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${baseUrl}/auth/callback?next=${encodeURIComponent(safeNext)}`,
    },
  });

  if (error || !data.url) {
    // Logged with context (AGENTS.md §2); user sees a soft error via query flag.
    console.error("[auth] signInWithOAuth failed:", error?.message);
    redirect("/login?error=oauth");
  }
  redirect(data.url);
}

export async function signOutAction() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}

"use server";

/* src/lib/auth/actions.ts
 * Supabase Auth server actions.
 *
 * NOTE: PRD §5.1 names Auth.js (NextAuth); we implement Supabase Auth instead
 * because the committed backend (middleware, server.ts, RLS) is built on
 * @supabase/ssr per AGENTS.md. Sign-up stays Google OAuth; in addition users
 * may set a password so they can later sign in with email + password.
 */
import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { fetchRoleByUserId, landingPathFor } from "@/lib/auth/landing";
import { siteUrl } from "@/lib/site-url";

export type ActionResult<T = void> =
  | { ok: true; data?: T }
  | { ok: false; error: string };

const MIN_PASSWORD = 8;

/** Basic sanity check shared by set-password and reset-password flows. */
function validatePassword(pw: string): string | null {
  if (pw.length < MIN_PASSWORD) {
    return `Kata sandi minimal ${MIN_PASSWORD} karakter.`;
  }
  return null;
}

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

/**
 * Sign in with email + password (users who set a password on their Google
 * account). On failure returns a friendly error instead of redirecting, so the
 * login form can show inline feedback (wrong password / no password set yet).
 */
export async function signInWithPasswordAction(
  email: string,
  password: string,
  next?: string,
): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: email.trim(),
    password,
  });
  if (error) {
    console.error("[auth] signInWithPassword failed:", error.message);
    return {
      ok: false,
      error:
        "Email atau kata sandi salah. Pastikan Anda sudah membuat kata sandi (masuk via Google lalu buka menu Keamanan Akun), atau gunakan Lupa kata sandi.",
    };
  }

  // Re-resolve the role for the correct landing (admins/cadres → dashboard).
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const role = user ? await fetchRoleByUserId(user.id) : null;
  redirect(landingPathFor(role, next));
}

/**
 * Sets or changes the password for the CURRENTLY signed-in user. Because the
 * account was created via Google, attaching a password lets them sign in later
 * with email + password too (same auth.users row).
 */
export async function setPasswordAction(password: string): Promise<ActionResult> {
  const invalid = validatePassword(password);
  if (invalid) return { ok: false, error: invalid };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Sesi berakhir, silakan masuk lagi." };

  const { error } = await supabase.auth.updateUser({ password });
  if (error) {
    console.error("[auth] setPassword failed:", error.message);
    return { ok: false, error: "Gagal menyimpan kata sandi. Coba lagi." };
  }
  return { ok: true };
}

/**
 * Sends a password-reset email. Always returns success-ish so we don't leak
 * which emails are registered (standard anti-enumeration behaviour).
 */
export async function resetPasswordAction(email: string): Promise<ActionResult> {
  const supabase = await createClient();
  const baseUrl = await oauthBaseUrl();
  const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
    redirectTo: `${baseUrl}/reset-password`,
  });
  if (error) {
    console.error("[auth] resetPassword failed:", error.message);
    return { ok: false, error: "Gagal mengirim tautan reset. Coba lagi." };
  }
  return { ok: true };
}

/**
 * Completes the reset-password flow: exchanges the one-time code from the
 * reset email for a session, then sets the new password and lands the user.
 */
export async function updatePasswordFromResetAction(
  code: string,
  password: string,
): Promise<ActionResult> {
  const invalid = validatePassword(password);
  if (invalid) return { ok: false, error: invalid };

  const supabase = await createClient();
  const { error: exchangeErr } = await supabase.auth.exchangeCodeForSession(code);
  if (exchangeErr) {
    console.error("[auth] reset code exchange failed:", exchangeErr.message);
    return { ok: false, error: "Tautan reset tidak valid atau sudah kedaluwarsa." };
  }

  const { error: updateErr } = await supabase.auth.updateUser({ password });
  if (updateErr) {
    console.error("[auth] reset password update failed:", updateErr.message);
    return { ok: false, error: "Gagal memperbarui kata sandi. Coba lagi." };
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  const role = user ? await fetchRoleByUserId(user.id) : null;
  redirect(landingPathFor(role));
}

/* src/lib/supabase/server.ts
 * Server-side Supabase client for RSC, Route Handlers, and middleware.
 *
 * Why two factories:
 *  - createClient()        : RLS-enforced via the user's session cookies.
 *                            Use for ALL user-facing server code.
 *  - createServiceClient() : bypasses RLS via SERVICE_ROLE_KEY. Use ONLY for
 *    trusted one-off jobs (migrations, seeding, anonymization). NEVER expose
 *    to a request handler that touches user input — it would let an attacker
 *    bypass RLS by crafting requests.
 */
import { createServerClient as ssrCreateServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { createClient as jsCreateClient, type SupabaseClient } from '@supabase/supabase-js';

function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing required env var: ${name}`);
  return v;
}

export async function createClient(): Promise<SupabaseClient> {
  const cookieStore = await cookies();
  return ssrCreateServerClient(
    requireEnv('NEXT_PUBLIC_SUPABASE_URL'),
    requireEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY'),
    {
      cookies: {
        getAll() { return cookieStore.getAll(); },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // Called from a Server Component where cookies are read-only.
            // Next.js throws; the SSR client already set the cookie on the
            // request, so this is safe to ignore (matches @supabase/ssr docs).
          }
        },
      },
    },
  );
}

export function createServiceClient(): SupabaseClient {
  // SECURITY: SERVICE_ROLE_KEY bypasses RLS. NEVER use in user-facing request paths.
  return jsCreateClient(
    requireEnv('NEXT_PUBLIC_SUPABASE_URL'),
    requireEnv('SUPABASE_SERVICE_ROLE_KEY'),
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}
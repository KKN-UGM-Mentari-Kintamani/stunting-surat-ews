/* src/middleware.ts
 * Next.js Edge Middleware — enforces the Route Permission Matrix
 * (00_MASTER_CROSS_PHASE_CONSISTENCY.md §1) in a data-driven, Phase-2-extensible way.
 *
 * Why data-driven array (PRD §6 mandate): adding Phase 2 routes is one array
 * entry, not a code change. The permission-check logic stays generic & testable.
 */
import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';

type Role = 'warga' | 'kader_kesehatan' | 'admin_desa';
interface RouteRule {
  pattern: string;           // path prefix, no trailing slash (e.g. '/admin/kesehatan')
  roles: Role[];             // roles allowed; unauthenticated users always rejected
  match: 'prefix' | 'exact'; // prefix covers nested routes
}

// ----- Route Permission Matrix (single source of truth, Phase 2-ready) -----
export const ROUTE_PERMISSIONS: RouteRule[] = [
  { pattern: '/profil',            roles: ['warga'],           match: 'exact'  },
  { pattern: '/admin/kesehatan',    roles: ['kader_kesehatan'], match: 'prefix' },
  // Phase 2 — active:
  { pattern: '/layanan-surat',  roles: ['warga'],            match: 'prefix' },
  { pattern: '/admin/surat',    roles: ['admin_desa'],       match: 'prefix' },
];

async function fetchRole(
  userId: string,
  supabase: ReturnType<typeof createServerClient>,
): Promise<Role | null> {
  // Per-request lookup; no persistent Edge cache. Phase 2 perf note:
  // store role in auth.users.raw_app_meta_data + read from the JWT claim instead
  // (requires a signup trigger to write the claim — already in place via fn_handle_new_user,
  // just add an UPDATE to raw_app_meta_data when role changes).
  const { data, error } = await supabase
    .from('users')
    .select('role')
    .eq('id', userId)
    .is('deleted_at', null)
    .maybeSingle();
  if (error) {
    // Never swallow — log context (AGENTS.md §2), degrade to "deny" safely.
    console.error('[middleware] users lookup failed', error.message);
    return null;
  }
  return (data?.role as Role) ?? null;
}

function matchRule(pathname: string): RouteRule | null {
  for (const rule of ROUTE_PERMISSIONS) {
    if (rule.match === 'exact' && pathname === rule.pattern) return rule;
    if (rule.match === 'prefix' &&
        (pathname === rule.pattern || pathname.startsWith(rule.pattern + '/'))) {
      return rule;
    }
  }
  return null;
}

export async function middleware(req: NextRequest) {
  const pathname = req.nextUrl.pathname;
  const rule = matchRule(pathname);
  if (!rule) return NextResponse.next();   // public route, nothing to enforce

  // Build the SSR client the SAME way server.ts does — so RLS & cookie refresh
  // behave identically between middleware and RSC (critical for auth-state sync).
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return req.cookies.getAll(); },
        setAll(cookiesToSet) {
          // Supabase SSR rotates the access token via these cookies; propagate
          // them back onto the request so downstream handlers see the refreshed
          // token. The final response headers are handled by NextResponse.next()
          // returning the mutated request cookies — see Supabase SSR migration notes.
          cookiesToSet.forEach(({ name, value }) => req.cookies.set(name, value));
        },
      },
    },
  );

  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) {
    const url = new URL('/login', req.url);
    url.searchParams.set('next', pathname);
    const redirect = NextResponse.redirect(url);
    return redirect;
  }

  const role = await fetchRole(user.id, supabase);
  if (!role || !rule.roles.includes(role)) {
    // Authenticated but unauthorized → send to home (avoid revealing route existence
    // to lower-privilege users; safer than an explicit 403 for an MVP).
    return NextResponse.redirect(new URL('/', req.url));
  }

  // Re-attach the (possibly refreshed) cookies to the downstream request so
  // RSC's server.ts createClient() reads the same fresh session.
  const requestHeaders = new Headers(req.headers);
  return NextResponse.next({ request: { headers: requestHeaders } });
}

// Only run middleware on protected prefixes (cost: skip static assets & public
// pages — `/`, `/edukasi` are public per the Route Permission Matrix).
export const config = {
  matcher: [
    '/profil',
    '/admin/kesehatan/:path*',
    '/layanan-surat/:path*',
    '/admin/surat/:path*',
  ],
};
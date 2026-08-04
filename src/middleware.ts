/* src/middleware.ts
 * Next.js Edge Middleware — enforces the Route Permission Matrix
 * (00_MASTER_CROSS_PHASE_CONSISTENCY.md §1) in a data-driven, Phase-2-extensible way.
 *
 * Two duties:
 *  1. Protected routes: reject unauthenticated / wrong-role users per the matrix.
 *  2. Public-home redirect: admins & cadres are sent straight to their own
 *     dashboard when they try to open the citizen home / education pages
 *     (their UI is the dashboard, not the citizen portal).
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

/** Citizen-facing pages that admins/cadres should NOT see (their UI is the dashboard). */
export const PUBLIC_ADMIN_REDIRECTS: { pattern: string; match: 'exact' | 'prefix'; dashboard: string }[] = [
  { pattern: '/', match: 'exact', dashboard: '/admin/surat' },      // role decided below
  { pattern: '/edukasi', match: 'prefix', dashboard: '/admin/surat' },
];

function roleDashboard(role: Role): string | null {
  if (role === 'admin_desa') return '/admin/surat';
  if (role === 'kader_kesehatan') return '/admin/kesehatan';
  return null;
}

function isPublicAdminRedirect(pathname: string): boolean {
  return PUBLIC_ADMIN_REDIRECTS.some((r) =>
    r.match === 'exact' ? pathname === r.pattern : pathname.startsWith(r.pattern),
  );
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

function buildClient(req: NextRequest) {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return req.cookies.getAll(); },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => req.cookies.set(name, value));
        },
      },
    },
  );
}

async function fetchRole(
  userId: string,
  supabase: ReturnType<typeof createServerClient>,
): Promise<Role | null> {
  const { data, error } = await supabase
    .from('users')
    .select('role')
    .eq('id', userId)
    .is('deleted_at', null)
    .maybeSingle();
  if (error) {
    console.error('[middleware] users lookup failed', error.message);
    return null;
  }
  return (data?.role as Role) ?? null;
}

export async function middleware(req: NextRequest) {
  const pathname = req.nextUrl.pathname;
  const supabase = buildClient(req);
  const { data: { user }, error } = await supabase.auth.getUser();
  const isAuthed = !error && !!user;

  // 1) Public citizen pages: if an admin/cadre is signed in, bounce them to
  //    their dashboard so they never see the citizen UI.
  if (isPublicAdminRedirect(pathname)) {
    if (isAuthed && user) {
      const role = await fetchRole(user.id, supabase);
      const dash = roleDashboard(role as Role);
      if (dash) {
        return NextResponse.redirect(new URL(dash, req.url));
      }
    }
    return NextResponse.next();
  }

  // 2) Protected routes (route permission matrix).
  const rule = matchRule(pathname);
  if (!rule) return NextResponse.next();

  if (!isAuthed || !user) {
    const url = new URL('/login', req.url);
    url.searchParams.set('next', pathname);
    return NextResponse.redirect(url);
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

// Only run middleware on protected prefixes + the citizen home/education pages
// (cost: skip static assets & the rest).
export const config = {
  matcher: [
    '/',
    '/edukasi',
    '/edukasi/:path*',
    '/profil',
    '/admin/kesehatan/:path*',
    '/layanan-surat/:path*',
    '/admin/surat/:path*',
  ],
};

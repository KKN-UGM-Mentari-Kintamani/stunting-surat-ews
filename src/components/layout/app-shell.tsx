/* src/components/layout/app-shell.tsx
 * Server-side shell: resolves the session once per request and hands plain
 * data to the client navs. Desktop Navbar (md+) + mobile BottomTabBar (<md)
 * per Design §3.3. On /admin/* both are suppressed — dashboards own their
 * chrome — so this shell simply renders the page content there.
 */
import { BottomTabBar } from "@/components/layout/bottom-tab-bar";
import { Navbar, type NavbarUser } from "@/components/layout/navbar";
import { createClient } from "@/lib/supabase/server";

async function getNavbarUser(): Promise<NavbarUser | null> {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error || !user) return null;

  const { data: profile, error: profileError } = await supabase
    .from("users")
    .select("nama_lengkap, email, role")
    .eq("id", user.id)
    .is("deleted_at", null)
    .maybeSingle();
  if (profileError) {
    // Fail open to "logged out" but never swallow the error silently.
    console.error("[app-shell] users lookup failed:", profileError.message);
    return null;
  }
  if (!profile) return null;
  return {
    name: profile.nama_lengkap,
    email: profile.email,
    role: profile.role,
  };
}

export async function AppShell({ children }: { children: React.ReactNode }) {
  const user = await getNavbarUser();

  return (
    <>
      <Navbar user={user} />

      {/* pb-20 keeps content clear of the fixed mobile tab bar. */}
      <main className="flex-1 pb-20 md:pb-0">{children}</main>

      <BottomTabBar />
    </>
  );
}

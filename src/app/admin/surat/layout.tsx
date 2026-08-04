/* src/app/admin/surat/layout.tsx
 * Admin Desa-only layout. Defense-in-depth: middleware already checks role, but
 * we re-verify server-side (same pattern as /admin/kesehatan).
 *
 * Desktop (md+): vertical sidebar — logo + title, main menu (Antrian / Walk-In /
 * Konfigurasi), and the account menu (Keluar) pinned at the bottom.
 * Mobile: slim top bar with the logo and the three menu links.
 */
import { redirect } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { LogOut, Plus, Settings, FileText } from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import { signOutAction } from "@/lib/auth/actions";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const MENU = [
  { href: "/admin/surat", label: "Antrian", icon: FileText },
  { href: "/admin/surat/walkin", label: "Walk-In", icon: Plus },
  { href: "/admin/surat/config", label: "Konfigurasi", icon: Settings },
];

export default async function AdminSuratLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/admin/surat");

  const { data: profile } = await supabase
    .from("users")
    .select("role, nama_lengkap, email")
    .eq("id", user.id)
    .is("deleted_at", null)
    .maybeSingle();
  if (!profile || profile.role !== "admin_desa") redirect("/");

  return (
    <div className="flex min-h-[100dvh]">
      {/* Desktop sidebar */}
      <aside className="sticky top-0 hidden h-[100dvh] w-60 shrink-0 flex-col border-r border-border bg-background md:flex">
        <Link href="/admin/surat" className="flex items-center gap-2 px-5 py-5">
          <Image src="/Logo.png" alt="Portal Desa" width={32} height={32} className="rounded-md" />
          <span className="font-display text-base font-semibold">Dasbor Surat</span>
        </Link>

        <nav className="flex flex-1 flex-col gap-1 px-3" aria-label="Menu admin surat">
          {MENU.map((m) => (
            <Link
              key={m.href}
              href={m.href}
              className="flex items-center gap-2 rounded-md px-3 py-2.5 text-[15px] font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <m.icon className="size-5" strokeWidth={1.5} aria-hidden />
              {m.label}
            </Link>
          ))}
        </nav>

        {/* Account menu pinned at the bottom */}
        <div className="border-t border-border px-4 py-4">
          <p className="truncate text-[14px] font-medium">{profile.nama_lengkap}</p>
          <p className="truncate text-[13px] text-muted-foreground">{profile.email}</p>
          <form action={signOutAction} className="mt-3">
            <Button variant="ghost" size="sm" className="w-full justify-start gap-2 px-2 text-status-rejected-fg">
              <LogOut className="size-4" strokeWidth={1.5} aria-hidden />
              Keluar
            </Button>
          </form>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Mobile top bar */}
        <header className="sticky top-0 z-30 border-b border-border bg-background/95 backdrop-blur-sm md:hidden">
          <div className="flex items-center gap-3 px-4">
            <Link href="/admin/surat" className="flex items-center gap-2 py-3">
              <Image src="/Logo.png" alt="Portal Desa" width={28} height={28} className="rounded-md" />
              <span className="font-display text-base font-semibold">Dasbor Surat</span>
            </Link>
            <form action={signOutAction} className="ml-auto">
              <Button variant="ghost" size="sm" aria-label="Keluar">
                <LogOut className="size-4" strokeWidth={1.5} aria-hidden />
              </Button>
            </form>
          </div>
          <nav aria-label="Menu admin surat" className="flex items-center gap-1 overflow-x-auto px-2 pb-2">
            {MENU.map((m) => (
              <Link
                key={m.href}
                href={m.href}
                className={cn(
                  "flex shrink-0 items-center gap-1.5 rounded-md px-3 py-2 text-[14px] font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground",
                )}
              >
                <m.icon className="size-4" strokeWidth={1.5} aria-hidden />
                {m.label}
              </Link>
            ))}
          </nav>
        </header>

        <main className="flex-1 px-5 pb-16 md:px-8 md:pb-10">
          {children}
        </main>
      </div>
    </div>
  );
}

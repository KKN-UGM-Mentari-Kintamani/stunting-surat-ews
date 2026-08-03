/* src/app/admin/surat/layout.tsx
 * Admin Desa-only layout. Defense-in-depth: middleware already checks role, but
 * we re-verify server-side (same pattern as /admin/kesehatan).
 */
import { redirect } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Plus, Settings, FileText } from "lucide-react";

import { createClient } from "@/lib/supabase/server";

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
    .select("role")
    .eq("id", user.id)
    .is("deleted_at", null)
    .maybeSingle();
  if (!profile || profile.role !== "admin_desa") redirect("/");

  return (
    <>
      <header className="sticky top-0 z-30 border-b border-border bg-background/95 backdrop-blur-sm">
        <div className="mx-auto flex h-14 w-full max-w-[1120px] items-center gap-4 px-5 md:px-8">
          <Link href="/admin/surat" className="flex items-center gap-2">
            <Image src="/Logo.png" alt="Portal Desa" width={28} height={28} className="rounded-md" />
            <span className="font-display text-base font-semibold">Dasbor Surat</span>
          </Link>
          <nav className="ml-auto flex items-center gap-1">
            <Link
              href="/admin/surat"
              className="flex h-10 items-center gap-1.5 rounded-md px-3 text-[14px] font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <FileText className="size-4" strokeWidth={1.5} aria-hidden />
              <span className="hidden sm:inline">Antrian</span>
            </Link>
            <Link
              href="/admin/surat/walkin"
              className="flex h-10 items-center gap-1.5 rounded-md px-3 text-[14px] font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <Plus className="size-4" strokeWidth={1.5} aria-hidden />
              <span className="hidden sm:inline">Walk-In</span>
            </Link>
            <Link
              href="/admin/surat/config"
              className="flex h-10 items-center gap-1.5 rounded-md px-3 text-[14px] font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <Settings className="size-4" strokeWidth={1.5} aria-hidden />
              <span className="hidden sm:inline">Konfigurasi</span>
            </Link>
          </nav>
        </div>
      </header>
      <div className="mx-auto w-full max-w-[1120px] px-5 pb-16 md:px-8">
        {children}
      </div>
    </>
  );
}
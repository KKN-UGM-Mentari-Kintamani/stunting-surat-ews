/* src/app/admin/kesehatan/layout.tsx
 * Cadre-only layout. Middleware already validates role=kader_kesehatan,
 * but we add a server-side guard as defense-in-depth (AGENTS.md §2). The
 * slim header stays out of the way on low-end mobile screens.
 */
import { redirect } from "next/navigation";
import Link from "next/link";
import { Sprout } from "lucide-react";

import { createClient } from "@/lib/supabase/server";

export default async function AdminKesehatanLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/admin/kesehatan");

  const { data: profile } = await supabase
    .from("users")
    .select("nama_lengkap, role")
    .eq("id", user.id)
    .is("deleted_at", null)
    .maybeSingle();
  if (!profile || profile.role !== "kader_kesehatan") redirect("/");

  return (
    <>
      <header className="sticky top-0 z-30 border-b border-border bg-background/95 backdrop-blur-sm">
        <div className="mx-auto flex h-14 w-full max-w-[1120px] items-center justify-between gap-4 px-5 md:px-8">
          <Link
            href="/admin/kesehatan"
            className="flex items-center gap-2"
          >
            <span className="flex size-8 items-center justify-center rounded-md bg-primary text-primary-foreground">
              <Sprout className="size-4" strokeWidth={1.5} aria-hidden />
            </span>
            <span className="font-display text-base font-semibold">
              Dasbor Posyandu
            </span>
          </Link>
          <p className="truncate text-[14px] text-muted-foreground">
            {profile.nama_lengkap} · Kader
          </p>
        </div>
      </header>
      <div className="mx-auto w-full max-w-[1120px] px-5 pb-16 md:px-8 md:pb-14">
        {children}
      </div>
    </>
  );
}
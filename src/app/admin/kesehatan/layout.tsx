/* src/app/admin/kesehatan/layout.tsx
 * Cadre-only layout. Middleware already validates role=kader_kesehatan,
 * but we add a server-side guard as defense-in-depth (AGENTS.md §2). The
 * slim header stays out of the way on low-end mobile screens.
 */
import Link from "next/link";
import Image from "next/image";
import { redirect } from "next/navigation";

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
    .select("role")
    .eq("id", user.id)
    .is("deleted_at", null)
    .maybeSingle();
  if (!profile || profile.role !== "kader_kesehatan") redirect("/");

  return (
    <>
      <header className="sticky top-0 z-30 border-b border-border bg-background/95 backdrop-blur-sm">
        <div className="mx-auto flex h-14 w-full max-w-[1120px] items-center gap-3 px-5 md:px-8">
          <Link
            href="/admin/kesehatan"
            className="flex items-center"
          >
            <Image
              src="/Logo.png"
              alt="Portal Desa"
              width={36}
              height={36}
              className="rounded-md"
            />
            <span className="font-display text-base font-semibold">
              Dasbor Posyandu
            </span>
          </Link>
        </div>
      </header>
      <div className="mx-auto w-full max-w-[1120px] px-5 pb-16 md:px-8 md:pb-14">
        {children}
      </div>
    </>
  );
}
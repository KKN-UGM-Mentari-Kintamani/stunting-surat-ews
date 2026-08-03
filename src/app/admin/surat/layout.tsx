/* src/app/admin/surat/layout.tsx
 * Admin Desa layout — role guard (middleware also enforces, defense-in-depth).
 */
import { redirect } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Landmark } from "lucide-react";

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
        <div className="mx-auto flex h-14 w-full max-w-[1120px] items-center gap-3 px-5 md:px-8">
          <Link href="/admin/surat" className="flex items-center gap-2">
            <Image
              src="/Logo.png"
              alt="Portal Desa"
              width={32}
              height={32}
              className="rounded-md"
            />
            <span className="flex items-center gap-1.5 font-display text-base font-semibold">
              <Landmark className="size-4" strokeWidth={1.5} aria-hidden />
              Dasbor Admin Surat
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

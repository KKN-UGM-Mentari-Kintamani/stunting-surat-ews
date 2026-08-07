/* src/app/profil/page.tsx
 * "Profil Saya" (PRD §4.2C). Satu card profil gabungan (identitas + data warga
 * + jumlah anak), tabs "Riwayat Surat" (default) & "Lihat Anak", dan menu
 * Keamanan Akun di paling bawah.
 */
import { Suspense } from "react";
import { redirect } from "next/navigation";

import { AutoOpenAddChild } from "@/app/profil/_components/auto-open-add-child";
import { WargaProfileCard } from "@/app/profil/_components/warga-profile-card";
import { AccountSecurity } from "@/components/auth/account-security";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { ChildrenSection } from "@/app/profil/_components/children-section";
import { ConsentGate } from "@/app/profil/_components/consent-gate";
import { ProfileTabs } from "@/app/profil/_components/profile-tabs";
import { ProfilSkeleton } from "@/app/profil/_components/profil-skeleton";
import { getProfileData } from "@/app/profil/_queries";

export const metadata = {
  title: "Profil Saya",
  description:
    "Kelola profil anak dan riwayat tumbuh kembang si kecil di Sigap Desa.",
};

export default async function ProfilPage({
  searchParams,
}: {
  searchParams: Promise<{ new?: string }>;
}) {
  const { new: newFlag } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/profil");

  return (
    <div className="mx-auto flex w-full max-w-[1120px] flex-col gap-8 px-5 py-10 md:px-8 md:py-14">
      <Suspense fallback={<ProfilSkeleton />}>
        <ProfilContent autoAddNew={newFlag === "1"} />
      </Suspense>
    </div>
  );
}

async function ProfilContent({ autoAddNew }: { autoAddNew: boolean }) {
  const data = await getProfileData();
  const consented = data.user.consent_given_at !== null;
  const childCount = data.children.filter((c) => c.inRange).length;

  return (
    <>
      {!consented && <ConsentGate />}

      {consented && (
        <>
          <WargaProfileCard
            profil={data.wargaProfil}
            namaAkun={data.user.nama_lengkap}
            email={data.user.email}
            childCount={childCount}
          />
          <ProfileTabs>
            <>
              <AutoOpenAddChild autoOpen={autoAddNew} />
              <ChildrenSection items={data.children} />
            </>
          </ProfileTabs>
          {/* Keamanan Akun selalu di paling bawah */}
          <AccountSecurity email={data.user.email} />
        </>
      )}
    </>
  );
}

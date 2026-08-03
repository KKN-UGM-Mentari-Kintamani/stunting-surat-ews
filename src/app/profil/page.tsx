/* src/app/profil/page.tsx
 * "Profil Saya" (PRD §4.2C). Gender-neutral label per PRD revision. This
 * page serves Phase 1 (growth history); a modular Tabs slot is reserved for
 * Phase 2's "Riwayat Surat" tab (Master Doc §2). The page integrates with the
 * global layout (BottomTabBar / Navbar) automatically via the root layout.
 */
import { Suspense } from "react";
import { redirect } from "next/navigation";

import { AutoOpenAddChild } from "@/app/profil/_components/auto-open-add-child";
import { createClient } from "@/lib/supabase/server";
import { ChildrenSection } from "@/app/profil/_components/children-section";
import { ConsentGate } from "@/app/profil/_components/consent-gate";
import { ProfileSummary } from "@/app/profil/_components/profile-summary";
import { ProfileTabs } from "@/app/profil/_components/profile-tabs";
import { ProfilSkeleton } from "@/app/profil/_components/profil-skeleton";
import { getProfileData } from "@/app/profil/_queries";
import { getMyLettersAction } from "@/app/layanan-surat/_actions";
import { LetterHistory } from "@/app/layanan-surat/_components/letter-history";
import type { MyLetterRow } from "@/app/layanan-surat/_actions";

export const metadata = {
  title: "Profil Saya",
  description:
    "Kelola profil anak dan riwayat tumbuh kembang si kecil di Portal Desa.",
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

  // Letter history for the Phase 2 tab.
  const lettersRes = await getMyLettersAction();
  const letters = (lettersRes.ok ? lettersRes.data : []) as MyLetterRow[];

  return (
    <>
      <ProfileSummary
        nama={data.user.nama_lengkap}
        email={data.user.email}
        childCount={data.children.filter((c) => c.inRange).length}
      />

      {!consented && <ConsentGate />}

      {consented && (
        <ProfileTabs
          letterTab={<LetterHistory rows={letters} />}
        >
          <>
            <AutoOpenAddChild autoOpen={autoAddNew} />
            <ChildrenSection items={data.children} />
          </>
        </ProfileTabs>
      )}
    </>
  );
}
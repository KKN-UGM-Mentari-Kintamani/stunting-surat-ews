/* src/app/layanan-surat/page.tsx
 * Layanan Surat — citizen letter service (Phase 2 PRD §4.1).
 * Server component: guards session, reads warga_profil + letter types + history.
 * Client forms handle progressive profiling / smart form / preview / submit.
 */
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { getWargaProfilAction } from "@/app/layanan-surat/_actions";
import { WargaProfilForm } from "@/app/layanan-surat/_components/warga-profil-form";
import { LetterRequestForm, type JenisSurat } from "@/app/layanan-surat/_components/letter-request-form";
import { LetterHistory } from "@/app/layanan-surat/_components/letter-history";
import type { MyLetterRow } from "@/app/layanan-surat/_actions";

export const metadata = {
  title: "Layanan Surat",
  description: "Ajukan surat keterangan desa secara online.",
};

export default async function LayananSuratPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/layanan-surat");

  const profilResult = await getWargaProfilAction();
  const profil = profilResult.ok ? (profilResult.data ?? null) : null;

  const { data: jenisData, error: jenisErr } = await supabase
    .from("master_jenis_surat")
    .select("id, nama_surat, kode_klasifikasi")
    .eq("is_active", true);
  if (jenisErr) {
    console.error("[layanan-surat] jenis fetch failed:", jenisErr.message);
  }
  const jenisSuratList = (jenisData ?? []) as unknown as JenisSurat[];

  const historyResult = await (await import("@/app/layanan-surat/_actions"))
    .getMyLettersAction();
  const history = historyResult.ok ? (historyResult.data ?? []) : [];

  return (
    <div className="mx-auto flex w-full max-w-[1120px] flex-col gap-8 px-5 py-10 md:px-8 md:py-14">
      <section>
        <p className="mb-3 text-[13px] font-medium tracking-[0.06em] text-primary uppercase">
          Administrasi Desa
        </p>
        <h1 className="font-display text-[28px] leading-[1.15] font-semibold md:text-[40px] md:leading-[1.1]">
          Layanan Surat
        </h1>
        <p className="mt-3 max-w-xl text-[16px] leading-[1.6] text-muted-foreground">
          Ajukan surat keterangan desa secara online tanpa antre.
        </p>
      </section>

      {!profil ? (
        <WargaProfilForm onSaved={() => {}} />
      ) : (
        <LetterRequestForm
          profil={profil}
          jenisSuratList={jenisSuratList}
          onSubmitted={() => {}}
        />
      )}

      <section className="flex flex-col gap-4">
        <h2 className="font-display text-[22px] leading-[1.25] font-medium">
          Riwayat Surat
        </h2>
        <LetterHistory rows={history} />
      </section>
    </div>
  );
}

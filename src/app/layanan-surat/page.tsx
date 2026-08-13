/* src/app/layanan-surat/page.tsx
 * Citizen letter service (PRD §4.1). Server component: fetches warga_profil +
 * active letter types + consent status, then hands to the client orchestrator.
 * Middleware ensures the user is logged in (warga role).
 */
import { notFound } from "next/navigation";

import { LayananSuratClient } from "@/app/layanan-surat/_components/layanan-surat-client";
import { createClient } from "@/lib/supabase/server";
import type { KadesConfig, TemplateKey } from "@/lib/surat/types";

export const metadata = {
  title: "Layanan Surat",
  description: "Ajukan surat keterangan secara online dari Sigap Desa.",
};

interface JenisSurat {
  id: string;
  nama_surat: string;
  kode_klasifikasi: string;
  template_key: TemplateKey;
}

export default async function LayananSuratPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) notFound();

  // Fetch profil + consent + letter types in parallel.
  const [profilRes, consentRes, typesRes, kadesRes] = await Promise.all([
    supabase
      .from("warga_profil")
      .select("nik,no_kk,nama,tempat_lahir,tanggal_lahir,jenis_kelamin,status,kewarganegaraan,agama,pekerjaan,alamat")
      .eq("user_id", user.id)
      .is("deleted_at", null)
      .maybeSingle(),
    supabase
      .from("users")
      .select("consent_given_at")
      .eq("id", user.id)
      .maybeSingle(),
    supabase
      .from("master_jenis_surat")
      .select("id,nama_surat,kode_klasifikasi,template_key")
      .eq("is_active", true),
    supabase
      .from("surat_kades_config")
      .select("nama_kades,nip_kades,jabatan,ttd_cap_url")
      .eq("id", 1)
      .maybeSingle(),
  ]);

  const profil = profilRes.data ?? null;
  const consented = !!consentRes.data?.consent_given_at;
  const jenisSuratList = (typesRes.data ?? []) as JenisSurat[];
  const kades = (kadesRes.data as KadesConfig | null) ?? null;

  return (
    <div className="mx-auto flex w-full max-w-[1120px] flex-col gap-8 px-5 py-10 md:px-8 md:py-14">
      <h1 className="font-display text-[28px] leading-[1.15] font-semibold md:text-[40px] md:leading-[1.1]">
        Layanan Surat
      </h1>
      <LayananSuratClient
        initialProfil={profil}
        consented={consented}
        jenisSuratList={jenisSuratList}
        kades={kades}
      />
    </div>
  );
}
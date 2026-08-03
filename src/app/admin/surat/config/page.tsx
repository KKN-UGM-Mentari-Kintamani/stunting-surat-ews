/* src/app/admin/surat/config/page.tsx */
import { createClient } from "@/lib/supabase/server";
import { KadesConfig } from "@/app/admin/surat/_components/kades-config";

export const metadata = { title: "Konfigurasi Kepala Desa" };

interface Config {
  nama_kades: string;
  nip_kades: string | null;
  jabatan: string | null;
  ttd_cap_url: string | null;
}

export default async function ConfigPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("surat_kades_config")
    .select("nama_kades,nip_kades,jabatan,ttd_cap_url")
    .eq("id", 1)
    .maybeSingle();
  return (
    <div className="flex flex-col gap-8 py-10 md:py-14">
      <h1 className="font-display text-[28px] leading-[1.15] font-semibold md:text-[36px]">
        Konfigurasi Kepala Desa
      </h1>
      <KadesConfig initialConfig={(data ?? null) as Config | null} />
    </div>
  );
}
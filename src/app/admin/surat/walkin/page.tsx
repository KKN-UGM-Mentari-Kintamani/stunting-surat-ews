/* src/app/admin/surat/walkin/page.tsx */
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { KadesConfig } from "@/lib/surat/types";
import { WalkInForm } from "@/app/admin/surat/_components/walk-in-form";

export const metadata = { title: "Buat Surat Walk-In" };

interface JenisSurat { id: string; nama_surat: string; kode_klasifikasi: string; }

export default async function WalkInPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("master_jenis_surat")
    .select("id,nama_surat,kode_klasifikasi")
    .eq("is_active", true);
  const { data: kadesData } = await supabase
    .from("surat_kades_config")
    .select("nama_kades,nip_kades,jabatan,ttd_cap_url")
    .eq("id", 1)
    .maybeSingle();
  return (
    <div className="flex flex-col gap-8 py-10 md:py-14">
      <h1 className="font-display text-[28px] leading-[1.15] font-semibold md:text-[36px]">
        Buat Surat (Walk-In)
      </h1>
      <p className="text-[15px] text-muted-foreground">
        Untuk warga yang datang langsung ke kantor desa tanpa akun online.
      </p>
      <WalkInForm
        jenisSuratList={(data ?? []) as JenisSurat[]}
        kades={(kadesData as KadesConfig | null) ?? null}
      />
    </div>
  );
}
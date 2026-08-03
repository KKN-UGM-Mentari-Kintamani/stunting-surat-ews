/* src/app/admin/surat/walkin/page.tsx
 * Admin Desa — buat surat walk-in (warga tanpa akun).
 */
import { createClient } from "@/lib/supabase/server";
import { WalkInForm } from "@/app/admin/surat/_components/walk-in-form";
import type { JenisSurat } from "@/app/layanan-surat/_components/letter-request-form";

export const metadata = { title: "Buat Surat Walk-In" };

export default async function WalkInPage() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("master_jenis_surat")
    .select("id, nama_surat, kode_klasifikasi")
    .eq("is_active", true);
  if (error) {
    console.error("[admin/surat/walkin] fetch failed:", error.message);
  }
  const jenisSuratList = (data ?? []) as unknown as JenisSurat[];

  return (
    <div className="flex flex-col gap-6 py-10 md:py-14">
      <h1 className="font-display text-[28px] leading-[1.15] font-semibold">
        Buat Surat Walk-In
      </h1>
      <WalkInForm jenisSuratList={jenisSuratList} />
    </div>
  );
}

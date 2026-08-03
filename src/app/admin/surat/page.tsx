/* src/app/admin/surat/page.tsx
 * Approval queue (PRD §4.2). Server: fetch menunggu list → render client queue.
 */
import { createClient } from "@/lib/supabase/server";
import { ApprovalQueue } from "@/app/admin/surat/_components/approval-queue";

export const metadata = { title: "Antrian Persetujuan Surat" };

interface QueueItem {
  id: string;
  data_isian_snapshot: Record<string, unknown>;
  created_at: string;
  jenis_surat: { nama_surat: string; kode_klasifikasi: string };
}

export default async function AdminSuratPage() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("permohonan_surat")
    .select(
      "id, data_isian_snapshot, created_at, jenis_surat:master_jenis_surat(nama_surat, kode_klasifikasi)",
    )
    .eq("status", "menunggu")
    .is("deleted_at", null)
    .order("created_at", { ascending: true });

  if (error) {
    console.error("[admin/surat] fetch failed:", error.message);
    return <p className="py-10 text-destructive">Gagal memuat data.</p>;
  }

  // Flatten nested jenis_surat array from Supabase.
  const items = ((data ?? []) as unknown as Array<{
    id: string;
    data_isian_snapshot: Record<string, unknown>;
    created_at: string;
    jenis_surat: { nama_surat: string; kode_klasifikasi: string }[];
  }>).map((r) => ({
    id: r.id,
    data_isian_snapshot: r.data_isian_snapshot,
    created_at: r.created_at,
    jenis_surat: r.jenis_surat?.[0] ?? { nama_surat: "—", kode_klasifikasi: "—" },
  }));

  return <ApprovalQueue items={items as unknown as QueueItem[]} />;
}
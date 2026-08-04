/* src/app/admin/surat/page.tsx
 * Approval queue (PRD §4.2) — redesigned as a professional CRUD table.
 * Server fetches ALL permohonan (every status) so actioned items stay visible;
 * sorting is newest-first. Client handles filtering + actions without reload.
 */
import { createClient } from "@/lib/supabase/server";
import { ApprovalQueue } from "@/app/admin/surat/_components/approval-queue";
import { QueueStats } from "@/app/admin/surat/_components/queue-stats";

export const metadata = { title: "Antrian Persetujuan Surat" };

export interface QueueItem {
  id: string;
  status: string;
  catatan_admin: string | null;
  nomor_surat_final: string | null;
  kode_verifikasi: string | null;
  pdf_final_url: string | null;
  data_isian_snapshot: Record<string, unknown>;
  created_at: string;
  updated_at: string | null;
  disetujui_at: string | null;
  jenis_surat: { nama_surat: string; kode_klasifikasi: string };
}

export default async function AdminSuratPage() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("permohonan_surat")
    .select(
      "id, status, catatan_admin, nomor_surat_final, kode_verifikasi, pdf_final_url, data_isian_snapshot, created_at, updated_at, disetujui_at, jenis_surat:master_jenis_surat(nama_surat, kode_klasifikasi)",
    )
    .is("deleted_at", null)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[admin/surat] fetch failed:", error.message);
    return <p className="py-10 text-destructive">Gagal memuat data.</p>;
  }

  // Flatten nested jenis_surat (Supabase returns either an array or a single object).
  const items = ((data ?? []) as unknown as Array<{
    id: string;
    status: string;
    catatan_admin: string | null;
    nomor_surat_final: string | null;
    kode_verifikasi: string | null;
    pdf_final_url: string | null;
    data_isian_snapshot: Record<string, unknown>;
    created_at: string;
    updated_at: string | null;
    disetujui_at: string | null;
    jenis_surat: { nama_surat: string; kode_klasifikasi: string }[] | { nama_surat: string; kode_klasifikasi: string } | null;
  }>).map((r) => {
    const jenis = Array.isArray(r.jenis_surat)
      ? r.jenis_surat[0]
      : r.jenis_surat;
    return {
      id: r.id,
      status: r.status,
      catatan_admin: r.catatan_admin,
      nomor_surat_final: r.nomor_surat_final,
      kode_verifikasi: r.kode_verifikasi,
      pdf_final_url: r.pdf_final_url,
      data_isian_snapshot: r.data_isian_snapshot,
      created_at: r.created_at,
      updated_at: r.updated_at,
      disetujui_at: r.disetujui_at,
      jenis_surat: jenis ?? { nama_surat: "—", kode_klasifikasi: "—" },
    };
  });

  // Monitoring stats.
  const total = items.length;
  const waiting = items.filter((i) => i.status === "menunggu").length;
  const todayKey = new Date().toDateString();
  const approvedToday = items.filter(
    (i) =>
      i.status === "disetujui" &&
      i.disetujui_at &&
      new Date(i.disetujui_at).toDateString() === todayKey,
  ).length;

  return (
    <div className="flex flex-col gap-6 py-10 md:py-14">
      <QueueStats total={total} approvedToday={approvedToday} waiting={waiting} />
      <ApprovalQueue items={items as unknown as QueueItem[]} />
    </div>
  );
}

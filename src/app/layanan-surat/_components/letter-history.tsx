"use client";

/* src/app/layanan-surat/_components/letter-history.tsx
 * Riwayat pengajuan surat warga — badge status + unduh PDF (signed URL).
 * Jika PDF sudah dihapus (3 hari), tampilkan pesan "hubungi kantor desa".
 */
import { useEffect, useState, useTransition } from "react";
import { Download, FileText } from "lucide-react";

import { getMyLettersAction, downloadLetterPdfAction } from "@/app/layanan-surat/_actions";
import type { MyLetterRow } from "@/app/layanan-surat/_actions";
import { LetterStatusBadge } from "@/components/surat/letter-status-badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Empty, EmptyDescription, EmptyTitle } from "@/components/ui/empty";

export function LetterHistory() {
  const [rows, setRows] = useState<MyLetterRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [downloading, startDownload] = useTransition();

  useEffect(() => {
    let active = true;
    (async () => {
      const res = await getMyLettersAction();
      if (active && res.ok && res.data) {
        // The nested jenis_surat returns as array from Supabase; flatten.
        const flat = res.data.map((r) => ({
          ...r,
          jenis_surat: (r.jenis_surat as unknown as { nama_surat: string; kode_klasifikasi: string }[] | null)?.[0] ?? null,
        }));
        setRows(flat as MyLetterRow[]);
      }
      if (active) setLoading(false);
    })();
    return () => { active = false; };
  }, []);

  function handleDownload(id: string) {
    startDownload(async () => {
      const res = await downloadLetterPdfAction(id);
      if (!res.ok || !res.data) {
        alert(res.ok ? "Data tidak tersedia." : res.error);
        return;
      }
      if (res.data.expired || !res.data.url) {
        alert("Masa unduh telah berakhir. Silakan hubungi kantor desa.");
        return;
      }
      window.open(res.data.url, "_blank");
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Riwayat Pengajuan Surat</CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <p className="text-[15px] text-muted-foreground">Memuat…</p>
        ) : rows.length === 0 ? (
          <Empty className="text-center">
            <EmptyTitle>Belum ada pengajuan</EmptyTitle>
            <EmptyDescription>
              Pengajuan surat Anda akan tampil di sini.
            </EmptyDescription>
          </Empty>
        ) : (
          <div className="flex flex-col gap-4">
            {/* Perforation edge (Design §5.2) on each card */}
            {rows.map((r) => (
              <div
                key={r.id}
                className="flex flex-col gap-3 rounded-md border border-border p-4 shadow-[0_2px_8px_rgba(43,40,35,0.06)]"
                style={{ borderTop: "2px dashed #E7E1D3" }}
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="flex items-start gap-2">
                    <FileText className="size-5 shrink-0 text-muted-foreground" strokeWidth={1.5} aria-hidden />
                    <div>
                      <p className="text-[15px] font-medium leading-snug">
                        {r.jenis_surat?.nama_surat ?? "Surat"}
                      </p>
                      <p className="text-[13px] text-muted-foreground">
                        {new Date(r.created_at).toLocaleDateString("id-ID", {
                          day: "numeric", month: "short", year: "numeric",
                        })}
                      </p>
                    </div>
                  </div>
                  <LetterStatusBadge status={r.status} />
                </div>

                {r.nomor_surat_final && (
                  <p className="tabular-data text-[14px] font-medium">
                    No. {r.nomor_surat_final}
                  </p>
                )}

                {r.status === "revisi" && r.catatan_admin && (
                  <div className="rounded-sm bg-status-revision-bg px-3 py-2 text-[14px] text-status-revision-fg">
                    <span className="font-medium">Catatan revisi: </span>
                    {r.catatan_admin}
                  </div>
                )}

                {r.status === "ditolak" && r.catatan_admin && (
                  <div className="rounded-sm bg-status-rejected-bg px-3 py-2 text-[14px] text-status-rejected-fg">
                    <span className="font-medium">Alasan: </span>
                    {r.catatan_admin}
                  </div>
                )}

                {r.status === "disetujui" && (
                  <div className="flex items-center gap-2">
                    {r.pdf_final_url ? (
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-1.5"
                        disabled={downloading}
                        onClick={() => handleDownload(r.id)}
                      >
                        <Download className="size-4" strokeWidth={1.5} aria-hidden />
                        Unduh PDF
                      </Button>
                    ) : (
                      <p className="text-[13px] text-muted-foreground">
                        Masa unduh telah berakhir. Silakan hubungi kantor desa.
                      </p>
                    )}
                    {r.kode_verifikasi && (
                      <span className="tabular-data text-[13px] text-muted-foreground">
                        Kode: {r.kode_verifikasi}
                      </span>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
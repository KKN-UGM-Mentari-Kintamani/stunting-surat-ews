"use client";

/* src/app/layanan-surat/_components/letter-history.tsx
 * Riwayat permohonan surat warga + unduh PDF final via signed URL.
 * Empty state per PRD §4.4.
 */
import { useState, useTransition } from "react";
import { Download, FileText } from "lucide-react";

import { downloadLetterPdfAction } from "@/app/layanan-surat/_actions";
import type { MyLetterRow } from "@/app/layanan-surat/_actions";
import { LetterStatusBadge } from "@/components/surat/letter-status-badge";
import { Button } from "@/components/ui/button";
import { Empty, EmptyDescription, EmptyTitle } from "@/components/ui/empty";
import { toast } from "sonner";

function fmtDate(s: string): string {
  return new Date(s).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function LetterHistory({ rows }: { rows: MyLetterRow[] }) {
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [, start] = useTransition();

  if (rows.length === 0) {
    return (
      <div className="flex justify-center py-10">
        <Empty className="max-w-md text-center">
          <EmptyTitle>Belum ada riwayat surat</EmptyTitle>
          <EmptyDescription>
            Perlu surat administrasi? Ajukan surat pertama Anda di atas.
          </EmptyDescription>
        </Empty>
      </div>
    );
  }

  function handleDownload(id: string) {
    setPendingId(id);
    start(async () => {
      const res = await downloadLetterPdfAction(id);
      setPendingId(null);
      if (res.ok && res.data) {
        window.open(res.data.url, "_blank");
        return;
      }
      toast.error(res.ok ? "PDF tidak tersedia." : res.error);
    });
  }

  return (
    <div className="flex flex-col gap-4">
      {rows.map((r) => (
        <div
          key={r.id}
          className="relative flex flex-col gap-3 rounded-md border border-border bg-card p-4 shadow-[0_2px_8px_rgba(43,40,35,0.06)]"
        >
          {/* Perforation edge (Design §5.2) — subtle top marker */}
          <div
            aria-hidden
            className="absolute -top-px left-0 right-0 flex justify-between overflow-hidden"
            style={{
              maskImage: "linear-gradient(to right, black 4px, transparent 4px)",
              WebkitMaskImage:
                "linear-gradient(to right, black 4px, transparent 4px)",
            }}
          />
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="flex flex-col gap-1">
              <p className="font-display text-[16px] font-medium">
                {r.jenis_surat?.nama_surat ?? "Surat"}
              </p>
              <p className="text-[13px] text-muted-foreground">
                {fmtDate(r.created_at)}
              </p>
              {r.nomor_surat_final && (
                <p className="tabular-data text-[13px] text-muted-foreground">
                  Nomor: {r.nomor_surat_final}
                </p>
              )}
            </div>
            <LetterStatusBadge status={r.status as MyLetterRow["status"]} />
          </div>

          {r.status === "revisi" && r.catatan_admin && (
            <p className="rounded-sm bg-muted px-3 py-2 text-[13px] leading-relaxed text-muted-foreground">
              <span className="font-medium text-foreground">Catatan admin: </span>
              {r.catatan_admin}
            </p>
          )}
          {r.status === "ditolak" && r.catatan_admin && (
            <p className="rounded-sm bg-muted px-3 py-2 text-[13px] leading-relaxed text-muted-foreground">
              <span className="font-medium text-foreground">Alasan: </span>
              {r.catatan_admin}
            </p>
          )}

          {r.status === "disetujui" && (
            <div className="mt-1 flex justify-end">
              <Button
                size="sm"
                variant="outline"
                className="gap-1.5"
                onClick={() => handleDownload(r.id)}
                disabled={pendingId === r.id}
              >
                <Download className="size-4" strokeWidth={1.5} aria-hidden />
                {pendingId === r.id ? "Menyiapkan…" : "Unduh PDF"}
              </Button>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

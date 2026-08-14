"use client";

/* src/app/admin/surat/_components/approval-queue.tsx
 * Redesigned as a professional CRUD table. Columns: No · Nama · Tanggal ·
 * Jenis Surat · Status · Tindakan.
 *   - Tindakan PDF (FileText) opens the final PDF in a new tab (only when
 *     approved).
 *   - Tindakan Detail (Eye) opens the 50:50 panel (preview / detail + aksi).
 * Items stay in the table after an action; status updates in local state
 * (no reload). A status filter sits above the table.
 */
import { useState, useTransition } from "react";
import { ChevronLeft, ChevronRight, Eye, FileText, Loader2 } from "lucide-react";

import { downloadLetterPdfAction } from "@/app/layanan-surat/_actions";
import { LetterDetailPanel } from "@/app/admin/surat/_components/letter-detail-panel";
import type { ApproveData, RejectData } from "@/app/admin/surat/_actions";
import type { KadesConfig } from "@/lib/surat/types";
import type { QueueItem } from "@/app/admin/surat/page";
import { LetterStatusBadge } from "@/components/surat/letter-status-badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Empty, EmptyDescription, EmptyTitle } from "@/components/ui/empty";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface Props {
  items: QueueItem[];
  kades?: KadesConfig | null;
}

const FILTERS = [
  { value: "semua", label: "Semua Status" },
  { value: "menunggu", label: "Menunggu" },
  { value: "disetujui", label: "Disetujui" },
  { value: "ditolak", label: "Ditolak" },
];

// Client-side pagination (desa-scale data, full fetch once).
const PAGE_SIZE = 20;
// Konsisten dengan retensi 7 hari di downloadLetterPdfAction & cron cleanup.
const RETENTION_MS = 7 * 24 * 60 * 60 * 1000;

function getSnap(r: Record<string, unknown>, key: string): string {
  return (r[key] as string) ?? "—";
}

function fmtTgl(v: string): string {
  return new Date(v).toLocaleDateString("id-ID", {
    day: "2-digit", month: "short", year: "numeric",
  });
}

/** Surat disetujui yang sudah melewati masa unduh 7 hari (tombol PDF nonaktif). */
function isExpired(item: QueueItem): boolean {
  if (item.status !== "disetujui" || !item.disetujui_at) return false;
  return Date.now() - new Date(item.disetujui_at).getTime() > RETENTION_MS;
}

export function ApprovalQueue({ items: initialItems, kades }: Props) {
  const [items, setItems] = useState<QueueItem[]>(initialItems);
  const [filter, setFilter] = useState("semua");
  const [page, setPage] = useState(1);
  const [openId, setOpenId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pdfPending, setPdfPending] = useState<string | null>(null);
  const [, start] = useTransition();

  const filtered = filter === "semua"
    ? items
    : items.filter((i) => i.status === filter);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  const paged = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const openItem = items.find((i) => i.id === openId) ?? null;

  function handleActionDone(
    id: string,
    status: string,
    patch?: ApproveData | RejectData,
  ) {
    setItems((prev) =>
      prev.map((i) =>
        i.id === id
          ? patch
            ? { ...i, ...patch }
            : { ...i, status }
          : i,
      ),
    );
  }

  function handleOpenPdf(id: string, item: QueueItem) {
    if (item.status !== "disetujui" || !item.pdf_final_url) return;
    if (isExpired(item)) {
      setError("Masa unduh telah berakhir. PDF hanya tersedia 7 hari sejak disetujui.");
      return;
    }
    setPdfPending(id);
    setError(null);
    start(async () => {
      try {
        const res = await downloadLetterPdfAction(id);
        if (!res.ok || !res.data?.url) {
          setError(res.ok ? "PDF tidak tersedia." : res.error);
          return;
        }
        window.open(res.data.url, "_blank");
      } catch (err) {
        console.error("[admin/surat] open pdf failed:", err);
        setError("Gagal membuka PDF.");
      } finally {
        setPdfPending(null);
      }
    });
  }

  return (
    <div className="flex flex-col gap-6">
      {/* <div>
        <h1 className="font-display text-[28px] leading-[1.15] font-semibold md:text-[32px]">
          Antrian Persetujuan
        </h1>
        <p className="mt-2 text-[15px] text-muted-foreground">
          Tinjau &amp; ambil tindakan pada permohonan surat.
        </p>
      </div> */}

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Status filter */}
      <div className="flex items-center gap-3">
        <span className="text-[14px] text-muted-foreground">Status:</span>
        <Select value={filter} onValueChange={(v) => { setFilter(v); setPage(1); }}>
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              {FILTERS.map((f) => (
                <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>
      </div>

      {filtered.length === 0 ? (
        <Empty className="text-center">
          <EmptyTitle>Tidak ada data</EmptyTitle>
          <EmptyDescription>
            Tidak ada permohonan surat dengan status ini.
          </EmptyDescription>
        </Empty>
      ) : (
        <div className="overflow-x-auto rounded-md border border-border">
          <Table className="min-w-[640px]">
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">No</TableHead>
                <TableHead>Nama Pemohon</TableHead>
                <TableHead>Tanggal</TableHead>
                <TableHead>Jenis Surat</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Tindakan</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paged.map((item, idx) => {
                const s = item.data_isian_snapshot;
                const expired = isExpired(item);
                const isApproved = item.status === "disetujui" && !!item.pdf_final_url && !expired;
                return (
                  <TableRow key={item.id}>
                    <TableCell className="tabular-data text-muted-foreground">
                      {(currentPage - 1) * PAGE_SIZE + idx + 1}
                    </TableCell>
                    <TableCell className="font-medium">
                      {getSnap(s, "nama")}
                      <span className="block text-[12px] font-normal text-muted-foreground">
                        {item.nomor_surat_final ? `No. ${item.nomor_surat_final}` : ""}
                      </span>
                    </TableCell>
                    <TableCell className="tabular-data text-[14px]">
                      {fmtTgl(item.created_at)}
                    </TableCell>
                    <TableCell className="text-[14px]">
                      {item.jenis_surat.nama_surat}
                    </TableCell>
                    <TableCell>
                      <LetterStatusBadge status={item.status} size="sm" />
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        {/* PDF (open final PDF in new tab — only when approved) */}
                        <Button
                          variant={isApproved ? "default" : "ghost"}
                          size="icon-xs"
                          disabled={!isApproved || pdfPending === item.id}
                          onClick={() => handleOpenPdf(item.id, item)}
                          aria-label="Lihat PDF final"
                        >
                          {pdfPending === item.id ? (
                            <Loader2 className="animate-spin" aria-hidden />
                          ) : (
                            <FileText className="size-3.5" strokeWidth={1.5} aria-hidden />
                          )}
                        </Button>
                        {/* Detail (open 50:50 panel) */}
                        <Button
                          variant={item.status === "menunggu"
                            ? "outline"
                            : "ghost"}
                          size="icon-xs"
                          onClick={() => setOpenId(item.id)}
                          aria-label="Detail permohonan"
                        >
                          <Eye className="size-3.5" strokeWidth={1.5} aria-hidden />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Pagination + catatan retensi 7 hari */}
      {filtered.length > 0 && (
        <div className="-mt-4 flex flex-col gap-2">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span className="text-[13px] text-muted-foreground">
              Menampilkan{" "}
              {(currentPage - 1) * PAGE_SIZE + 1}–
              {Math.min(currentPage * PAGE_SIZE, filtered.length)} dari {filtered.length}
            </span>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="icon-xs"
                disabled={currentPage <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                aria-label="Halaman sebelumnya"
              >
                <ChevronLeft className="size-3.5" strokeWidth={1.5} aria-hidden />
              </Button>
              <span className="tabular-data text-[13px] text-muted-foreground">
                Hal {currentPage}/{pageCount}
              </span>
              <Button
                variant="outline"
                size="icon-xs"
                disabled={currentPage >= pageCount}
                onClick={() => setPage((p) => Math.min(pageCount, p + 1))}
                aria-label="Halaman berikutnya"
              >
                <ChevronRight className="size-3.5" strokeWidth={1.5} aria-hidden />
              </Button>
            </div>
          </div>
          <p className="text-[12px] leading-relaxed text-muted-foreground">
            Catatan: PDF hanya dapat diunduh selama 7 hari sejak disetujui. Baris
            dengan tombol unduh nonaktif telah melewati masa unduh.
          </p>
        </div>
      )}

      {openItem && (
        <LetterDetailPanel
          item={openItem}
          open={!!openItem}
          onOpenChange={(v) => { if (!v) setOpenId(null); }}
          onActionDone={handleActionDone}
          kades={kades}
        />
      )}
    </div>
  );
}

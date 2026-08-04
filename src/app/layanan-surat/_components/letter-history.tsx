"use client";

/* src/app/layanan-surat/_components/letter-history.tsx
 * Riwayat pengajuan surat warga — tabel (menyamakan antrian admin).
 * Kolom: Tanggal · Jenis Surat · Nomor · Status · Tindakan.
 *   - disetujui → "Unduh PDF"
 *   - ditolak   → "Lihat Catatan" (dialog berisi alasan admin)
 *   - menunggu  → menunggu proses
 * PDF yang sudah lewat 3 hari → pesan "hubungi kantor desa".
 * Status "revisi" telah dihapus dari alur (admin menolak dgn komentar).
 */
import { useEffect, useState, useTransition } from "react";
import { Download, MessageSquareText } from "lucide-react";

import {
  getMyLettersAction,
  downloadLetterPdfAction,
} from "@/app/layanan-surat/_actions";
import type { MyLetterRow } from "@/app/layanan-surat/_actions";
import { LetterStatusBadge } from "@/components/surat/letter-status-badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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

const FILTERS = [
  { value: "semua", label: "Semua Status" },
  { value: "menunggu", label: "Menunggu" },
  { value: "disetujui", label: "Disetujui" },
  { value: "ditolak", label: "Ditolak" },
];

function fmtTgl(v: string): string {
  return new Date(v).toLocaleDateString("id-ID", {
    day: "2-digit", month: "short", year: "numeric",
  });
}

function flattenJenis(r: MyLetterRow): MyLetterRow {
  return {
    ...r,
    jenis_surat: (Array.isArray(r.jenis_surat)
      ? r.jenis_surat[0]
      : r.jenis_surat) as MyLetterRow["jenis_surat"],
  };
}

export function LetterHistory() {
  const [rows, setRows] = useState<MyLetterRow[]>([]);
  const [filter, setFilter] = useState("semua");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [noteId, setNoteId] = useState<string | null>(null);
  const [isPending, start] = useTransition();

  useEffect(() => {
    let active = true;
    (async () => {
      const res = await getMyLettersAction();
      if (active) {
        if (res.ok && res.data) {
          setRows(res.data.map(flattenJenis));
        } else {
          setError(res.ok ? "Data tidak tersedia." : res.error);
        }
        setLoading(false);
      }
    })();
    return () => { active = false; };
  }, []);

  const filtered = filter === "semua"
    ? rows
    : rows.filter((r) => r.status === filter);

  const noteRow = rows.find((r) => r.id === noteId) ?? null;

  function handleDownload(id: string) {
    setError(null);
    start(async () => {
      const res = await downloadLetterPdfAction(id);
      if (!res.ok || !res.data) {
        setError(res.ok ? "Data tidak tersedia." : res.error);
        return;
      }
      if (res.data.expired || !res.data.url) {
        setError("Masa unduh telah berakhir. Silakan hubungi kantor desa.");
        return;
      }
      window.open(res.data.url, "_blank");
    });
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <CardTitle>Riwayat Pengajuan Surat</CardTitle>
          <Select value={filter} onValueChange={setFilter}>
            <SelectTrigger className="w-44">
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
      </CardHeader>
      <CardContent>
        {error && (
          <div className="mb-4">
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          </div>
        )}

        {loading ? (
          <p className="text-[15px] text-muted-foreground">Memuat…</p>
        ) : filtered.length === 0 ? (
          <Empty className="text-center">
            <EmptyTitle>Belum ada pengajuan</EmptyTitle>
            <EmptyDescription>
              Pengajuan surat Anda akan tampil di sini.
            </EmptyDescription>
          </Empty>
        ) : (
          <div className="overflow-x-auto rounded-md border border-border">
            <Table className="min-w-[640px]">
              <TableHeader>
                <TableRow>
                  <TableHead>Tanggal</TableHead>
                  <TableHead>Jenis Surat</TableHead>
                  <TableHead>Nomor</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Tindakan</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="tabular-data text-[14px]">
                      {fmtTgl(r.created_at)}
                    </TableCell>
                    <TableCell className="font-medium">
                      {r.jenis_surat?.nama_surat ?? "Surat"}
                    </TableCell>
                    <TableCell className="tabular-data text-[14px]">
                      {r.nomor_surat_final ?? "—"}
                    </TableCell>
                    <TableCell>
                      <LetterStatusBadge status={r.status} size="sm" />
                    </TableCell>
                    <TableCell className="text-right">
                      {r.status === "disetujui" ? (
                        <Button
                          variant="outline"
                          size="sm"
                          className="gap-1.5"
                          disabled={!r.pdf_final_url || isPending}
                          onClick={() => handleDownload(r.id)}
                        >
                          <Download className="size-4" strokeWidth={1.5} aria-hidden />
                          Unduh PDF
                        </Button>
                      ) : r.status === "ditolak" ? (
                        <Button
                          variant="outline"
                          size="sm"
                          className="gap-1.5"
                          onClick={() => setNoteId(r.id)}
                        >
                          <MessageSquareText className="size-4" strokeWidth={1.5} aria-hidden />
                          Lihat Catatan
                        </Button>
                      ) : r.status === "disetujui" && !r.pdf_final_url ? (
                        <span className="text-[13px] text-muted-foreground">
                          Masa unduh berakhir
                        </span>
                      ) : (
                        <span className="text-[13px] text-muted-foreground">
                          Menunggu proses
                        </span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>

      {/* Lihat Catatan (untuk ditolak) */}
      <Dialog open={!!noteRow} onOpenChange={(v) => { if (!v) setNoteId(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Catatan Penolakan</DialogTitle>
            <DialogDescription>
              {noteRow?.jenis_surat?.nama_surat ?? "Surat"} · Diajukan{" "}
              {noteRow ? fmtTgl(noteRow.created_at) : ""}
            </DialogDescription>
          </DialogHeader>
          <p className="rounded-md border border-border bg-muted/40 p-4 text-[15px] leading-relaxed">
            {noteRow?.catatan_admin || "Tidak ada catatan."}
          </p>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

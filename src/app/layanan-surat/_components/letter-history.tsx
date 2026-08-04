"use client";

/* src/app/layanan-surat/_components/letter-history.tsx
 * Riwayat pengajuan surat warga — tabel (menyamakan antrian admin).
 * Kolom: Tanggal · Jenis Surat · Nomor · Status · Tindakan.
 *   - disetujui → unduh PDF (signed URL) + kode verifikasi
 *   - revisi    → "Edit & Ajukan Ulang" (PRD §4.1 — edit permohonan yang sama)
 *   - ditolak   → alasan (catatan admin)
 * PDF yang sudah lewat 3 hari → pesan "hubungi kantor desa".
 */
import { useEffect, useState, useTransition } from "react";
import { Download, FileEdit } from "lucide-react";

import {
  getMyLettersAction,
  downloadLetterPdfAction,
  resubmitPermohonanAction,
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
  { value: "revisi", label: "Perlu Revisi" },
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
  const [busy, setBusy] = useState<string | null>(null);
  const [isPending, start] = useTransition();

  const load = () => {
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
  };

  useEffect(() => load(), []);

  const filtered = filter === "semua"
    ? rows
    : rows.filter((r) => r.status === filter);

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

  function handleResubmit(id: string) {
    setError(null);
    setBusy(id);
    // Resubmit the same request (PRD §4.1); snapshot is kept server-side.
    start(async () => {
      const res = await resubmitPermohonanAction(id);
      setBusy(null);
      if (!res.ok) { setError(res.error); return; }
      load();
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
            <Table className="min-w-[720px]">
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
                {filtered.map((r) => {
                  const sd = r.status;
                  return (
                    <TableRow key={r.id}>
                      <TableCell className="tabular-data text-[14px]">
                        {fmtTgl(r.created_at)}
                      </TableCell>
                      <TableCell className="font-medium">
                        {r.jenis_surat?.nama_surat ?? "Surat"}
                        {r.status === "revisi" && r.catatan_admin && (
                          <span className="block text-[12px] font-normal text-status-revision-fg">
                            Catatan: {r.catatan_admin}
                          </span>
                        )}
                        {r.status === "ditolak" && r.catatan_admin && (
                          <span className="block text-[12px] font-normal text-status-rejected-fg">
                            Alasan: {r.catatan_admin}
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="tabular-data text-[14px]">
                        {r.nomor_surat_final ?? "—"}
                      </TableCell>
                      <TableCell>
                        <LetterStatusBadge status={sd} size="sm" />
                      </TableCell>
                      <TableCell className="text-right">
                        {sd === "disetujui" ? (
                          <div className="flex items-center justify-end gap-2">
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
                            {r.kode_verifikasi && (
                              <span className="tabular-data text-[13px] text-muted-foreground">
                                {r.kode_verifikasi}
                              </span>
                            )}
                          </div>
                        ) : sd === "revisi" ? (
                          <Button
                            variant="default"
                            size="sm"
                            className="gap-1.5"
                            disabled={busy === r.id}
                            onClick={() => handleResubmit(r.id)}
                          >
                            <FileEdit className="size-4" strokeWidth={1.5} aria-hidden />
                            {busy === r.id ? "Mengirim…" : "Edit & Ajukan Ulang"}
                          </Button>
                        ) : sd === "disetujui" && !r.pdf_final_url ? (
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
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

"use client";

/* src/app/admin/surat/_components/approval-queue.tsx
 * Antrian persetujuan (PRD §4.2): 3 aksi per permohonan — Setujui (trigger
 * worker + polling), Minta Revisi (catatan wajib), Tolak (catatan wajib).
 */
import { useState, useTransition, useCallback } from "react";
import { Check, FileEdit, Loader2, XCircle } from "lucide-react";

import {
  approveAction,
  requestRevisionAction,
  rejectAction,
  getLetterStatusAction,
} from "@/app/admin/surat/_actions";
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
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Empty, EmptyDescription, EmptyTitle } from "@/components/ui/empty";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface QueueItem {
  id: string;
  data_isian_snapshot: Record<string, unknown>;
  created_at: string;
  jenis_surat: { nama_surat: string; kode_klasifikasi: string };
}

interface Props {
  items: QueueItem[];
}

function getSnap(r: Record<string, unknown>, key: string): string {
  return (r[key] as string) ?? "—";
}

export function ApprovalQueue({ items }: Props) {
  const [reviseOpen, setReviseOpen] = useState<string | null>(null);
  const [rejectOpen, setRejectOpen] = useState<string | null>(null);
  const [catatan, setCatatan] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [processing, setProcessing] = useState<string | null>(null);
  const [polling, setPolling] = useState(false);
  const [done, setDone] = useState<string | null>(null);
  const [isPending, start] = useTransition();

  const handleApprove = useCallback(async (id: string) => {
    setError(null);
    setProcessing(id);
    const res = await approveAction(id);
    if (!res.ok) {
      setError(res.error);
      setProcessing(null);
      return;
    }
    // Poll until status changes (worker finishes or fails).
    setPolling(true);
    let attempts = 0;
    const poll = async () => {
      attempts++;
      if (attempts > 30) { // 30 × 2s = 60s max
        setError("Waktu tunggu habis. Cek status manual.");
        setProcessing(null);
        setPolling(false);
        return;
      }
      const status = await getLetterStatusAction(id);
      if (!status.ok || !status.data) {
        setError(status.ok ? "Data tidak tersedia." : status.error);
        setProcessing(null);
        setPolling(false);
        return;
      }
      const d = status.data;
      if (d.status === "disetujui") {
        setDone(id);
        setProcessing(id);
        setPolling(false);
        window.location.reload();
        return;
      }
      if (d.status === "menunggu" && !d.processing) {
        // Worker failed or returned to menunggu.
        setError("Render PDF gagal. Coba lagi.");
        setProcessing(null);
        setPolling(false);
        return;
      }
      setTimeout(poll, 2000);
    };
    setTimeout(poll, 2000);
  }, []);

  function handleRevise(id: string) {
    setError(null);
    start(async () => {
      const res = await requestRevisionAction(id, catatan);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setReviseOpen(null);
      setCatatan("");
      window.location.reload();
    });
  }

  function handleReject(id: string) {
    setError(null);
    start(async () => {
      const res = await rejectAction(id, catatan);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setRejectOpen(null);
      setCatatan("");
      window.location.reload();
    });
  }

  return (
    <div className="flex flex-col gap-8 py-10 md:py-14">
      <div>
        <h1 className="font-display text-[28px] leading-[1.15] font-semibold md:text-[36px]">
          Antrian Persetujuan
        </h1>
        <p className="mt-2 text-[15px] text-muted-foreground">
          Permohonan surat yang menunggu persetujuan Anda.
        </p>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {items.length === 0 ? (
        <Empty className="text-center">
          <EmptyTitle>Antrian kosong</EmptyTitle>
          <EmptyDescription>
            Tidak ada permohonan surat yang menunggu persetujuan saat ini.
          </EmptyDescription>
        </Empty>
      ) : (
        <div className="flex flex-col gap-4">
          {items.map((item) => {
            const s = item.data_isian_snapshot;
            const isProcessing = processing === item.id;
            return (
              <Card key={item.id}>
                <CardHeader>
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="flex flex-col gap-1">
                      <CardTitle>{item.jenis_surat.nama_surat}</CardTitle>
                      <p className="text-[13px] text-muted-foreground">
                        Diajukan {new Date(item.created_at).toLocaleDateString("id-ID", {
                          day: "numeric", month: "short", year: "numeric",
                        })}
                      </p>
                    </div>
                    {isProcessing && (
                      <div className="flex items-center gap-2 text-[14px] text-muted-foreground">
                        <Loader2 className="animate-spin" aria-hidden />
                        {polling ? "Menerbitkan Dokumen…" : "Memulai…"}
                      </div>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  <dl className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    <div className="flex gap-2"><dt className="text-muted-foreground">Nama:</dt><dd className="font-medium">{getSnap(s, "nama")}</dd></div>
                    <div className="flex gap-2"><dt className="text-muted-foreground">NIK:</dt><dd className="tabular-data">{getSnap(s, "nik")}</dd></div>
                    <div className="flex gap-2"><dt className="text-muted-foreground">Pekerjaan:</dt><dd>{getSnap(s, "pekerjaan")}</dd></div>
                    <div className="flex gap-2"><dt className="text-muted-foreground">Agama:</dt><dd>{getSnap(s, "agama")}</dd></div>
                    <div className="flex gap-2"><dt className="text-muted-foreground">Alamat:</dt><dd className="flex-1">{getSnap(s, "alamat")}</dd></div>
                  </dl>
                  {(s.data_khusus as Record<string, string> | undefined)?.nama_usaha && (
                    <dl className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
                      <div className="flex gap-2"><dt className="text-muted-foreground">Usaha:</dt><dd className="font-medium">{(s.data_khusus as Record<string, string>).nama_usaha}</dd></div>
                      <div className="flex gap-2"><dt className="text-muted-foreground">Jenis:</dt><dd>{(s.data_khusus as Record<string, string>).jenis_usaha}</dd></div>
                    </dl>
                  )}

                  {done === item.id && (
                    <div className="mt-3 rounded-sm bg-status-normal-bg px-3 py-2 text-[14px] font-medium text-status-normal-fg">
                      Surat berhasil diterbitkan.
                    </div>
                  )}

                  {done !== item.id && (
                    <div className="mt-4 flex flex-wrap items-center gap-2">
                      <Button
                        variant="default"
                        className="gap-1.5"
                        disabled={isProcessing}
                        onClick={() => handleApprove(item.id)}
                      >
                        {isProcessing ? <Loader2 className="animate-spin" aria-hidden /> : <Check className="size-4" strokeWidth={1.5} aria-hidden />}
                        Setujui
                      </Button>

                      <Dialog open={reviseOpen === item.id} onOpenChange={(v) => { setReviseOpen(v ? item.id : null); setCatatan(""); }}>
                        <DialogTrigger asChild>
                          <Button variant="outline" className="gap-1.5" disabled={isProcessing}>
                            <FileEdit className="size-4" strokeWidth={1.5} aria-hidden />
                            Minta Revisi
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Minta Revisi</DialogTitle>
                            <DialogDescription>
                              Berikan catatan untuk warga. Catatan wajib diisi.
                            </DialogDescription>
                          </DialogHeader>
                          <Input
                            value={catatan}
                            onChange={(e) => setCatatan(e.target.value)}
                            placeholder="Contoh: No. KK terbalik dengan suami, tolong perbaiki."
                          />
                          <DialogFooter>
                            <Button variant="ghost" onClick={() => { setReviseOpen(null); setCatatan(""); }}>Batal</Button>
                            <Button disabled={!catatan.trim()||isPending} onClick={() => handleRevise(item.id)}>Kirim Revisi</Button>
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>

                      <Dialog open={rejectOpen === item.id} onOpenChange={(v) => { setRejectOpen(v ? item.id : null); setCatatan(""); }}>
                        <DialogTrigger asChild>
                          <Button variant="destructive" className="gap-1.5" disabled={isProcessing}>
                            <XCircle className="size-4" strokeWidth={1.5} aria-hidden />
                            Tolak
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Tolak Permohonan</DialogTitle>
                            <DialogDescription>
                              Berikan alasan penolakan (final). Warga tidak bisa mengedit lagi.
                            </DialogDescription>
                          </DialogHeader>
                          <Input
                            value={catatan}
                            onChange={(e) => setCatatan(e.target.value)}
                            placeholder="Contoh: Data tidak lengkap, mohon buat permohonan baru."
                          />
                          <DialogFooter>
                            <Button variant="ghost" onClick={() => { setRejectOpen(null); setCatatan(""); }}>Batal</Button>
                            <Button variant="destructive" disabled={!catatan.trim()||isPending} onClick={() => handleReject(item.id)}>Tolak</Button>
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
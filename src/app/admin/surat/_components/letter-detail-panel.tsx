"use client";

/* src/app/admin/surat/_components/letter-detail-panel.tsx
 * 50:50 panel for an admin decision.
 *   Left  — letter draft preview (no TTE / nomor — what the citizen saw).
 *   Right — top: full applicant detail; bottom: action form (dropdown aksi +
 *           catatan, submit/cancel). Catatan optional for setuju, required for
 *           revisi/tolak.
 */
import { useState, useTransition } from "react";
import { Loader2 } from "lucide-react";

import { submitAksiAction } from "@/app/admin/surat/_actions";
import { LetterPreview } from "@/app/layanan-surat/_components/letter-preview";
import type { QueueItem } from "@/app/admin/surat/page";
import type { IsianSnapshot } from "@/lib/surat/types";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
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
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";

type Aksi = "setuju" | "revisi" | "tolak";

interface Props {
  item: QueueItem;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Called after a successful action so the parent updates status w/o reload. */
  onActionDone: (id: string, status: string) => void;
}

function fmtTanggal(v: string): string {
  return new Date(v).toLocaleDateString("id-ID", {
    day: "numeric", month: "long", year: "numeric",
  });
}

function getSnap(s: Record<string, unknown>, key: string): string {
  return (s[key] as string) ?? "—";
}

export function LetterDetailPanel({ item, open, onOpenChange, onActionDone }: Props) {
  const [aksi, setAksi] = useState<Aksi | null>(null);
  const [catatan, setCatatan] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, start] = useTransition();

  const s = item.data_isian_snapshot;
  const snapshot = s as unknown as IsianSnapshot;
  const catatanWajib = aksi === "revisi" || aksi === "tolak";
  const canSubmit = !!aksi && (!catatanWajib || catatan.trim().length > 0);
  const sudahDiAksi = item.status !== "menunggu" && item.status !== "revisi";

  function reset() {
    setAksi(null);
    setCatatan("");
    setError(null);
  }

  function handleSubmit() {
    if (!aksi) return;
    setError(null);
    start(async () => {
      const res = await submitAksiAction(item.id, aksi, catatan.trim() || undefined);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      onActionDone(
        item.id,
        aksi === "setuju" ? "disetujui" : aksi === "revisi" ? "revisi" : "ditolak",
      );
      onOpenChange(false);
      reset();
    });
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) reset();
        onOpenChange(v);
      }}
    >
      <DialogContent className="max-w-5xl">
        <DialogHeader>
          <DialogTitle>{item.jenis_surat.nama_surat}</DialogTitle>
          <DialogDescription>
            Diajukan {fmtTanggal(item.created_at)}
            {item.nomor_surat_final ? ` · No. ${item.nomor_surat_final}` : ""}
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          {/* Left: preview draft */}
          <div className="flex flex-col gap-2">
            <p className="text-[13px] font-medium text-muted-foreground">
              Pratinjau Surat (tanpa TTE & nomor)
            </p>
            <div className="max-h-[520px] overflow-y-auto rounded-md border border-border">
              <LetterPreview
                namaSurat={item.jenis_surat.nama_surat}
                snapshot={snapshot}
              />
            </div>
          </div>

          {/* Right: detail + action */}
          <div className="flex flex-col gap-4">
            {/* Detail */}
            <div>
              <p className="mb-2 text-[13px] font-medium text-muted-foreground">
                Data Permohonan
              </p>
              <dl className="flex flex-col gap-1.5 rounded-md border border-border bg-muted/40 p-3 text-[14px]">
                <div className="flex flex-wrap gap-2"><dt className="text-muted-foreground">Nama:</dt><dd className="font-medium">{getSnap(s, "nama")}</dd></div>
                <div className="flex flex-wrap gap-2"><dt className="text-muted-foreground">NIK:</dt><dd className="tabular-data">{getSnap(s, "nik")}</dd></div>
                <div className="flex flex-wrap gap-2"><dt className="text-muted-foreground">No. KK:</dt><dd className="tabular-data">{getSnap(s, "no_kk")}</dd></div>
                <div className="flex flex-wrap gap-2"><dt className="text-muted-foreground">TTL:</dt><dd>{getSnap(s, "tempat_lahir")} / {getSnap(s, "tanggal_lahir")}</dd></div>
                <div className="flex flex-wrap gap-2"><dt className="text-muted-foreground">Agama:</dt><dd>{getSnap(s, "agama")}</dd></div>
                <div className="flex flex-wrap gap-2"><dt className="text-muted-foreground">Pekerjaan:</dt><dd>{getSnap(s, "pekerjaan")}</dd></div>
                <div className="flex flex-wrap gap-2"><dt className="text-muted-foreground">Alamat:</dt><dd>{getSnap(s, "alamat")}</dd></div>
                {(s.data_khusus as Record<string, string> | undefined)?.nama_usaha && (
                  <>
                    <div className="flex flex-wrap gap-2"><dt className="text-muted-foreground">Usaha:</dt><dd>{(s.data_khusus as Record<string, string>).nama_usaha}</dd></div>
                    <div className="flex flex-wrap gap-2"><dt className="text-muted-foreground">Jenis:</dt><dd>{(s.data_khusus as Record<string, string>).jenis_usaha}</dd></div>
                  </>
                )}
                <div className="border-t border-border pt-1.5" />
                <div className="flex flex-wrap gap-2"><dt className="text-muted-foreground">Tujuan:</dt><dd>{getSnap(s, "tujuan_permohonan")}</dd></div>
                <div className="flex flex-wrap gap-2"><dt className="text-muted-foreground">No. Telepon:</dt><dd className="tabular-data">{getSnap(s, "nomor_telepon")}</dd></div>
                <div className="flex flex-wrap gap-2">
                  <dt className="text-muted-foreground">Pernyataan benar:</dt>
                  <dd className={s.pernyataan_benar ? "font-medium text-status-normal-fg" : "font-medium text-status-rejected-fg"}>
                    {s.pernyataan_benar ? "✓ Sudah" : "✗ Belum"}
                  </dd>
                </div>
              </dl>
            </div>

            {/* Action form */}
            {sudahDiAksi ? (
              <div className="rounded-md border border-border bg-muted/40 p-3 text-[14px]">
                <p className="font-medium">Status permohonan: {item.status}</p>
                {item.catatan_admin ? (
                  <p className="mt-1 text-[13px] text-muted-foreground">
                    Catatan: {item.catatan_admin}
                  </p>
                ) : null}
              </div>
            ) : (
              <div className="flex flex-col gap-3 rounded-md border border-border p-3">
                <p className="text-[13px] font-medium text-muted-foreground">
                  Tindakan
                </p>
                <Select value={aksi ?? ""} onValueChange={(v) => setAksi(v as Aksi)}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Pilih aksi…" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      <SelectItem value="setuju">Setujui</SelectItem>
                      <SelectItem value="revisi">Minta Revisi</SelectItem>
                      <SelectItem value="tolak">Tolak</SelectItem>
                    </SelectGroup>
                  </SelectContent>
                </Select>
                <Textarea
                  value={catatan}
                  onChange={(e) => setCatatan(e.target.value)}
                  placeholder={
                    catatanWajib
                      ? "Catatan wajib diisi…"
                      : "Catatan (opsional)…"
                  }
                  rows={3}
                />
                {catatanWajib && (
                  <p className="text-[12px] text-muted-foreground">
                    Catatan wajib untuk aksi ini.
                  </p>
                )}
                {error && (
                  <Alert variant="destructive">
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}
              </div>
            )}
          </div>
        </div>

        {!sudahDiAksi && (
          <DialogFooter className="gap-2">
            <Button variant="ghost" onClick={() => { onOpenChange(false); reset(); }} disabled={isPending}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={!canSubmit || isPending} className="gap-2">
              {isPending && <Loader2 className="animate-spin" aria-hidden />}
              Submit
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}

"use client";

/* src/app/admin/surat/_components/letter-detail-panel.tsx
 * 50:50 panel for an admin decision.
 *   Left  — letter draft preview (no TTE / nomor — what the citizen saw).
 *   Right — top: full applicant detail; bottom: action form (dropdown aksi +
 *           catatan, submit/cancel). Catatan optional for setuju, required for
 *           revisi/tolak.
 */
import { useRef, useState, useTransition } from "react";
import { Loader2 } from "lucide-react";

import { submitAksiAction } from "@/app/admin/surat/_actions";
import { LetterPreview } from "@/app/layanan-surat/_components/letter-preview";
import type { KadesConfig } from "@/lib/surat/types";
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
import { Input } from "@/components/ui/input";
import { RequiredMark } from "@/components/ui/required-mark";
import { Alert, AlertDescription } from "@/components/ui/alert";

type Aksi = "setuju" | "tolak";

interface Props {
  item: QueueItem;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Called after a successful action so the parent updates status w/o reload. */
  onActionDone: (id: string, status: string) => void;
  /** Current Kades config (nama/jabatan/NIP/TTE) for the preview signer. */
  kades?: KadesConfig | null;
}

function fmtTanggal(v: string): string {
  return new Date(v).toLocaleDateString("id-ID", {
    day: "numeric", month: "long", year: "numeric",
  });
}

function fmtWaktu(v?: string | null): string {
  if (!v) return "—";
  const d = new Date(v);
  return Number.isNaN(d.getTime())
    ? "—"
    : d.toLocaleString("id-ID", {
        day: "numeric", month: "short", year: "numeric",
        hour: "2-digit", minute: "2-digit",
      });
}

function getSnap(s: Record<string, unknown>, key: string): string {
  return (s[key] as string) ?? "—";
}

export function LetterDetailPanel({ item, open, onOpenChange, onActionDone, kades }: Props) {
  const [aksi, setAksi] = useState<Aksi | null>(null);
  const [catatan, setCatatan] = useState("");
  const [nomorSurat, setNomorSurat] = useState("");
  const [tujuanSktm, setTujuanSktm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, start] = useTransition();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const submittingRef = useRef(false);

  const s = item.data_isian_snapshot;
  const snapshot = s as unknown as IsianSnapshot;
  const isSktm = item.jenis_surat.template_key === "sktm";
  const catatanWajib = aksi === "tolak";
  const canSubmit =
    !!aksi &&
    (!catatanWajib || catatan.trim().length > 0) &&
    (aksi !== "setuju" || nomorSurat.trim().length > 0) &&
    (aksi !== "setuju" || !isSktm || tujuanSktm.trim().length > 0);
  const sudahDiAksi = item.status !== "menunggu";

  function reset() {
    setAksi(null);
    setCatatan("");
    setNomorSurat("");
    setTujuanSktm("");
    setError(null);
  }
  function handleSubmit() {
    if (!aksi || isSubmitting || submittingRef.current) return;
    setError(null);
    submittingRef.current = true;
    setIsSubmitting(true);
    start(async () => {
      try {
        const res = await submitAksiAction(
          item.id,
          aksi,
          catatan.trim() || undefined,
          aksi === "setuju" ? nomorSurat.trim() : undefined,
          aksi === "setuju" ? tujuanSktm.trim() || undefined : undefined,
        );
        if (!res.ok) {
          setError(res.error);
          return;
        }
        onActionDone(
          item.id,
          aksi === "setuju" ? "disetujui" : "ditolak",
        );
        onOpenChange(false);
        reset();
      } finally {
        submittingRef.current = false;
        setIsSubmitting(false);
      }
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
      <DialogContent className="flex h-[90vh] w-[92vw] max-w-[1500px] flex-col overflow-hidden sm:max-w-none">
        <DialogHeader className="shrink-0">
          <DialogTitle>{item.jenis_surat.nama_surat}</DialogTitle>
          <DialogDescription>
            Diajukan {fmtTanggal(item.created_at)}
            {item.nomor_surat_final ? ` · No. ${item.nomor_surat_final}` : ""}
          </DialogDescription>
        </DialogHeader>

        {/* 60/40: left = preview (stretches), right = detail+action (scrolls) */}
        <div className="grid min-h-0 flex-1 grid-cols-1 gap-6 overflow-hidden lg:grid-cols-[3fr_2fr]">
          {/* Left: preview draft — stretches to fill, scrolls only if taller */}
          <div className="flex min-h-0 flex-col gap-2">
            <p className="shrink-0 text-[13px] font-medium text-muted-foreground">
              Pratinjau Surat (tanpa TTE & nomor)
            </p>
            <div className="min-h-0 flex-1 overflow-y-auto">
              <LetterPreview
                namaSurat={item.jenis_surat.nama_surat}
                templateKey={item.jenis_surat.template_key}
                snapshot={snapshot}
                kades={kades}
                tujuanSktmOverride={isSktm ? tujuanSktm : undefined}
              />
            </div>
          </div>

          {/* Right: detail + action — vertical scroll only on this column */}
          <div className="min-h-0 overflow-y-auto pr-1">
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
                  {Object.entries(s.data_khusus ?? {}).map(([k, v]) => {
                    const labelMap: Record<string, string> = {
                      jenis_usaha: "Jenis Usaha",
                      lokasi_usaha: "Lokasi Usaha",
                      alamat_tujuan_pindah: "Alamat Tujuan Pindah",
                      alasan_pindah: "Alasan Pindah",
                      jenis_kepindahan: "Jenis Kepindahan",
                      status_kk_yang_pindah: "Status KK yang Pindah",
                      nama_ayah: "Nama Ayah",
                      nama_ibu: "Nama Ibu",
                      tahun_meninggal: "Tahun Meninggal",
                      tempat_meninggal: "Tempat Meninggal",
                      sebab_meninggal: "Sebab Meninggal",
                      tujuan_sktm: "Tujuan SKTM",
                    };
                    return v ? (
                      <div className="flex flex-wrap gap-2" key={k}>
                        <dt className="text-muted-foreground">{labelMap[k] ?? k}:</dt>
                        <dd>{String(v)}</dd>
                      </div>
                    ) : null;
                  })}
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

              {/* Process timestamps */}
              <div className="rounded-md border border-border bg-muted/40 p-3 text-[14px]">
                <p className="mb-1.5 text-[13px] font-medium text-muted-foreground">
                  Waktu Proses
                </p>
                <dl className="flex flex-col gap-1">
                  <div className="flex flex-wrap gap-2"><dt className="text-muted-foreground">Diajukan:</dt><dd className="tabular-data">{fmtWaktu(item.created_at)}</dd></div>
                  <div className="flex flex-wrap gap-2"><dt className="text-muted-foreground">Terakhir diproses:</dt><dd className="tabular-data">{fmtWaktu(item.updated_at)}</dd></div>
                  {item.status === "disetujui" && (
                    <div className="flex flex-wrap gap-2"><dt className="text-muted-foreground">Disetujui:</dt><dd className="tabular-data">{fmtWaktu(item.disetujui_at)}</dd></div>
                  )}
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
                      <SelectItem value="tolak">Tolak</SelectItem>
                    </SelectGroup>
                    </SelectContent>
                  </Select>
                  {aksi === "setuju" && (
                    <div className="flex flex-col gap-3">
                      <div className="flex flex-col gap-1">
                        <label htmlFor="nomor-surat" className="text-[13px] font-medium leading-snug">
                          Nomor Surat <RequiredMark />
                        </label>
                        <Input
                          id="nomor-surat"
                          value={nomorSurat}
                          onChange={(e) => setNomorSurat(e.target.value)}
                          placeholder="Contoh: 470/012/VII/2026"
                        />
                      </div>
                      {isSktm && (
                        <div className="flex flex-col gap-1">
                          <label htmlFor="tujuan-sktm" className="text-[13px] font-medium leading-snug">
                            Tujuan SKTM <RequiredMark />
                          </label>
                          <Input
                            id="tujuan-sktm"
                            value={tujuanSktm}
                            onChange={(e) => setTujuanSktm(e.target.value)}
                            placeholder="Frasa yang tertulis di surat, contoh: untuk administrasi mencari sekolah"
                          />
                          <p className="text-[12px] text-muted-foreground">
                            Frasa ini tertulis pada surat: {"\u201c"}...masuk kategori keluarga tidak mampu, dan {tujuanSktm.trim() || "[tujuan]"}. Apabila...{"\u201d"}
                          </p>
                        </div>
                      )}
                    </div>
                  )}
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
        </div>

        {!sudahDiAksi && (
          <DialogFooter className="shrink-0 gap-2">
            <Button variant="ghost" onClick={() => { onOpenChange(false); reset(); }} disabled={isPending}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={!canSubmit || isPending || isSubmitting} className="gap-2">
              {isPending && <Loader2 className="animate-spin" aria-hidden />}
              Submit
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}

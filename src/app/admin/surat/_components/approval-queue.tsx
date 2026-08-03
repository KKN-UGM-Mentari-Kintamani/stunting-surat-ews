"use client";

/* src/app/admin/surat/_components/approval-queue.tsx
 * Antrian permohonan (status menunggu). 3 aksi: Setujui / Minta Revisi / Tolak.
 * Saat "Setujui" ditekan → memicu worker → polling getLetterStatusAction sampai
 * status berubah atau processing_at kedaluwarsa (PRD §4.4: tombol loading
 * "Menerbitkan Dokumen…" mencegah double-click).
 */
import { useEffect, useRef, useState, useTransition } from "react";
import { Check, Loader2, PencilLine, X } from "lucide-react";

import {
  approveAction,
  getLetterStatusAction,
  rejectAction,
  requestRevisionAction,
} from "@/app/admin/surat/_actions";
import type { QueueItem } from "@/app/admin/surat/_actions";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

export function ApprovalQueue({
  initialQueue,
}: {
  initialQueue: QueueItem[];
}) {
  const [queue, setQueue] = useState<QueueItem[]>(initialQueue);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const pollTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  function clearQueueItem(id: string) {
    setQueue((prev) => prev.filter((q) => q.id !== id));
  }

  // ---------- Setujui (with polling) ----------
  function handleApprove(id: string) {
    setProcessingId(id);
    startApprove(async () => {
      const res = await approveAction(id);
      if (!res.ok) {
        setProcessingId(null);
        toast.error(res.error);
        return;
      }
      // Poll until the worker finishes.
      pollTimer.current = setInterval(async () => {
        const st = await getLetterStatusAction(id);
        if (!st.ok || !st.data) {
          clearInterval(pollTimer.current!);
          pollTimer.current = null;
          setProcessingId(null);
          toast.error(st.ok ? "Gagal membaca status." : st.error);
          return;
        }
        if (st.data.processing) return; // still rendering
        clearInterval(pollTimer.current!);
        pollTimer.current = null;
        setProcessingId(null);
        if (st.data.status === "disetujui") {
          toast.success(`Surat terbit: ${st.data.nomorSurat}`);
        } else {
          toast.error("Gagal menerbitkan surat. Coba lagi.");
        }
        clearQueueItem(id);
      }, 2000);
    });
  }

  // ---------- Minta Revisi / Tolak (dialog) ----------
  function ActionWithNote({
    id,
    type,
    onDone,
  }: {
    id: string;
    type: "revisi" | "tolak";
    onDone: () => void;
  }) {
    const [open, setOpen] = useState(false);
    const [note, setNote] = useState("");
    const [busy, setBusy] = useState(false);

    async function submit() {
      if (!note.trim()) return;
      setBusy(true);
      const res =
        type === "revisi"
          ? await requestRevisionAction(id, note)
          : await rejectAction(id, note);
      setBusy(false);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success(type === "revisi" ? "Revisi diminta." : "Permohonan ditolak.");
      setOpen(false);
      onDone();
    }

    return (
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button
            variant={type === "tolak" ? "destructive" : "outline"}
            size="sm"
            className="gap-1.5"
          >
            {type === "revisi" ? (
              <PencilLine className="size-4" strokeWidth={1.5} aria-hidden />
            ) : (
              <X className="size-4" strokeWidth={1.5} aria-hidden />
            )}
            {type === "revisi" ? "Minta Revisi" : "Tolak"}
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {type === "revisi" ? "Minta Revisi" : "Tolak Permohonan"}
            </DialogTitle>
            <DialogDescription>
              {type === "revisi"
                ? "Isi catatan perbaikan agar warga dapat mengedit dan mengajukan ulang."
                : "Isi alasan penolakan final. Permohonan tidak dapat diajukan ulang."}
            </DialogDescription>
          </DialogHeader>
          <FieldGroup>
            <Field data-invalid={!note.trim() && open}>
              <FieldLabel htmlFor="note" className="text-[15px] font-medium">
                Catatan / Alasan <span className="text-destructive">*</span>
              </FieldLabel>
              <Input
                id="note"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Tulis catatan…"
              />
              {!note.trim() && open && (
                <FieldError errors={[{ message: "Catatan wajib diisi." }]} />
              )}
            </Field>
          </FieldGroup>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)} disabled={busy}>
              Batal
            </Button>
            <Button
              variant={type === "tolak" ? "destructive" : "default"}
              disabled={!note.trim() || busy}
              onClick={submit}
            >
              {busy && <Loader2 className="animate-spin" aria-hidden />}
              Simpan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  function startApprove(fn: () => Promise<void>) {
    void fn();
  }

  useEffect(() => {
    return () => {
      if (pollTimer.current) clearInterval(pollTimer.current);
    };
  }, []);

  if (queue.length === 0) {
    return (
      <p className="py-10 text-center text-[15px] text-muted-foreground">
        Tidak ada permohonan menunggu.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {actionError && (
        <p className="text-[13px] text-destructive">{actionError}</p>
      )}
      {queue.map((q) => {
        const s = q.data_isian_snapshot ?? {};
        const processing = processingId === q.id;
        return (
          <div key={q.id} className="rounded-md border border-border bg-card p-4 shadow-[0_2px_8px_rgba(43,40,35,0.06)]">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="flex flex-col gap-1">
                <p className="font-display text-[16px] font-medium">
                  {s.nama ?? "—"} · {q.jenis_surat?.nama_surat ?? "Surat"}
                </p>
                <p className="text-[13px] text-muted-foreground">
                  NIK: {s.nik ?? "—"} ·{" "}
                  {new Date(q.created_at).toLocaleDateString("id-ID")}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="default"
                  size="sm"
                  className="gap-1.5"
                  disabled={processing}
                  onClick={() => handleApprove(q.id)}
                >
                  {processing ? (
                    <Loader2 className="animate-spin" aria-hidden />
                  ) : (
                    <Check className="size-4" strokeWidth={1.5} aria-hidden />
                  )}
                  {processing ? "Menerbitkan Dokumen…" : "Setujui"}
                </Button>
                <ActionWithNote
                  id={q.id}
                  type="revisi"
                  onDone={() => clearQueueItem(q.id)}
                />
                <ActionWithNote
                  id={q.id}
                  type="tolak"
                  onDone={() => clearQueueItem(q.id)}
                />
              </div>
            </div>
            <p className="mt-2 text-[13px] text-muted-foreground">
              {s.alamat ?? ""}
            </p>
          </div>
        );
      })}
    </div>
  );
}

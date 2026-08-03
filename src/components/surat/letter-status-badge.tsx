/* src/components/surat/letter-status-badge.tsx
 * Badge untuk status permohonan surat (Design §1.3, §6.3).
 * Pastel + ikon + label — tidak hanya warna (aksesibilitas).
 *
 * Token mapping:
 *   menunggu   → waiting (biru-grey)
 *   revisi     → revision (gold)
 *   disetujui  → normal (hijau, reuse health normal token per Design §1.3)
 *   ditolak    → rejected (merah-bata)
 */
import { Check, Clock, FileEdit, XCircle } from "lucide-react";

import type { StatusPermohonan } from "@/lib/surat/types";
import { cn } from "@/lib/utils";

interface Props {
  status: StatusPermohonan | string;
  className?: string;
}

/** Also handles a transient "processing" pseudo-status for the admin UI. */
const STATUS_MAP: Record<string, { label: string; Icon: typeof Clock; tone: string }> = {
  menunggu: {
    label: "Menunggu",
    Icon: Clock,
    tone: "bg-status-waiting-bg text-status-waiting-fg",
  },
  proses: {
    label: "Menerbitkan…",
    Icon: Clock,
    tone: "bg-status-waiting-bg text-status-waiting-fg",
  },
  revisi: {
    label: "Perlu Revisi",
    Icon: FileEdit,
    tone: "bg-status-revision-bg text-status-revision-fg",
  },
  disetujui: {
    label: "Disetujui",
    Icon: Check,
    tone: "bg-status-normal-bg text-status-normal-fg",
  },
  ditolak: {
    label: "Ditolak",
    Icon: XCircle,
    tone: "bg-status-rejected-bg text-status-rejected-fg",
  },
};

export function LetterStatusBadge({ status, className }: Props) {
  const entry = STATUS_MAP[status] ?? STATUS_MAP.menunggu;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-pill px-3 py-1.5 text-[15px] font-medium",
        entry.tone,
        className,
      )}
    >
      <entry.Icon className="size-4" strokeWidth={1.5} aria-hidden />
      {entry.label}
    </span>
  );
}
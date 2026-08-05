/* src/components/surat/letter-status-badge.tsx
 * Badge untuk status permohonan surat (Design §1.3, §6.3).
 * Pastel + ikon + label — tidak hanya warna (aksesibilitas).
 *
 * Token mapping:
 *   menunggu   → waiting (biru-grey)
 *   disetujui  → normal (hijau, reuse health normal token per Design §1.3)
 *   ditolak    → rejected (merah-bata)
 *
 * Status "revisi" telah dihapus dari alur (admin menolak dgn komentar →
 * warga membuat pengajuan baru), sehingga tidak ada badge-nya lagi.
 */
import { Check, Clock, XCircle } from "lucide-react";

import type { StatusPermohonan } from "@/lib/surat/types";
import { cn } from "@/lib/utils";

interface Props {
  status: StatusPermohonan | string;
  className?: string;
  /** "sm" for dense tables, "md" (default) for card layouts. */
  size?: "sm" | "md";
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

export function LetterStatusBadge({ status, className, size = "md" }: Props) {
  const entry = STATUS_MAP[status] ?? STATUS_MAP.menunggu;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-pill font-medium",
        size === "sm" ? "px-2 py-0.5 text-[14px]" : "px-3 py-1.5 text-[15px]",
        entry.tone,
        className,
      )}
    >
      <entry.Icon
        className={size === "sm" ? "size-3.5" : "size-4"}
        strokeWidth={1.5}
        aria-hidden
      />
      {entry.label}
    </span>
  );
}
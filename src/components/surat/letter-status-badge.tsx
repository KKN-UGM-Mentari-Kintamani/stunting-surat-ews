/* src/components/surat/letter-status-badge.tsx
 * Status badge untuk modul surat (Design §1.3). NEVER color-only: selalu
 * ikon + label. Warna pastel; "Disetujui" reuse green "Normal" — satu bahasa
 * visual untuk "hasil baik" di seluruh portal.
 */
import { Clock, PencilLine, FileCheck, FileX } from "lucide-react";

import type { StatusPermohonan } from "@/lib/surat/types";
import { cn } from "@/lib/utils";

const STATUS: Record<
  StatusPermohonan,
  { label: string; Icon: typeof Clock; className: string }
> = {
  menunggu: {
    label: "Menunggu",
    Icon: Clock,
    className: "bg-status-waiting-bg text-status-waiting-fg",
  },
  revisi: {
    label: "Perlu Revisi",
    Icon: PencilLine,
    className: "bg-status-revision-bg text-status-revision-fg",
  },
  disetujui: {
    label: "Disetujui",
    Icon: FileCheck,
    className: "bg-status-normal-bg text-status-normal-fg",
  },
  ditolak: {
    label: "Ditolak",
    Icon: FileX,
    className: "bg-status-rejected-bg text-status-rejected-fg",
  },
};

export function LetterStatusBadge({
  status,
  className,
}: {
  status: StatusPermohonan;
  className?: string;
}) {
  const { label, Icon, className: tone } = STATUS[status];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-pill px-3 py-1 text-[14px] font-medium",
        tone,
        className,
      )}
    >
      <Icon className="size-4" strokeWidth={1.5} aria-hidden />
      {label}
    </span>
  );
}

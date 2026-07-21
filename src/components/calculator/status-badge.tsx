/* src/components/calculator/status-badge.tsx
 * Pastel status pill (Design §1.2 / §6.3). NEVER color-only: status always
 * ships with an icon + explicit text label so it survives color-blindness
 * (Design §1.5) — the soft icons (sprout/leaf/heart) keep health results calm,
 * never medical-alarm "!" marks (PRD §4.2A).
 */
import { HeartPulse, Leaf, Sprout } from "lucide-react";

import type { StuntingStatus } from "@/lib/calc/lms";
import { cn } from "@/lib/utils";

interface StatusBadgeProps {
  status: StuntingStatus;
  className?: string;
}

const STATUS = {
  normal: {
    label: "Tumbuh dengan baik",
    Icon: Sprout,
    className: "bg-status-normal-bg text-status-normal-fg",
  },
  mild: {
    label: "Perlu perhatian",
    Icon: Leaf,
    className: "bg-status-mild-bg text-status-mild-fg",
  },
  high: {
    label: "Butuh dampingan",
    Icon: HeartPulse,
    className: "bg-status-high-bg text-status-high-fg",
  },
} as const;

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const { label, Icon, className: tone } = STATUS[status];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 rounded-pill px-4 py-2 text-[15px] font-medium",
        tone,
        className,
      )}
    >
      <Icon className="size-5" strokeWidth={1.5} aria-hidden />
      {label}
    </span>
  );
}

export function StatusHeadline({ status }: { status: StuntingStatus }) {
  if (status === "normal") {
    return "Si kecil tumbuh dengan baik.";
  }
  if (status === "mild") {
    return "Tumbuh kembang si kecil butuh sedikit perhatian ekstra.";
  }
  return "Yuk dampingan tumbuh kembang si kecil bersama Posyandu.";
}
"use client";

/* src/app/admin/surat/_components/admin-surat-nav.tsx
 * Sidebar/top-bar navigation for the letter admin, with active-state
 * highlighting (bg-primary/10 + text-primary, matching the navbar).
 */
import Link from "next/link";
import { usePathname } from "next/navigation";
import { FileText, Plus, Settings } from "lucide-react";

import { cn } from "@/lib/utils";

const MENU = [
  { href: "/admin/surat", label: "Antrian", icon: FileText },
  { href: "/admin/surat/walkin", label: "Buat Surat", icon: Plus },
  { href: "/admin/surat/config", label: "Konfigurasi", icon: Settings },
];

export function AdminSuratNav({ variant }: { variant: "sidebar" | "topbar" }) {
  const pathname = usePathname();

  return (
    <nav aria-label="Menu admin surat" className={cn(
      variant === "sidebar"
        ? "flex flex-1 flex-col gap-1 px-3"
        : "flex items-center gap-1 overflow-x-auto px-2 pb-2",
    )}>
      {MENU.map((m) => {
        const active = pathname === m.href;
        return (
          <Link
            key={m.href}
            href={m.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex items-center gap-2 rounded-md font-medium transition-colors",
              variant === "sidebar"
                ? "px-3 py-2.5 text-[15px]"
                : "shrink-0 px-3 py-2 text-[14px]",
              active
                ? "bg-primary/10 font-semibold text-primary"
                : "text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            <m.icon
              className={variant === "sidebar" ? "size-5" : "size-4"}
              strokeWidth={1.5}
              aria-hidden
            />
            {m.label}
          </Link>
        );
      })}
    </nav>
  );
}

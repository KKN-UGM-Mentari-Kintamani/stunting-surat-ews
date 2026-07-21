"use client";

/* src/components/calculator/save-history-button.tsx
 * Save-to-Growth-History affordance (PRD §4.2A). Stage scope (agreed):
 *  - Guest      → opens a login dialog explaining SSO is required (PDP consent
 *                is handled on the /login page itself, never bypassed here).
 *  - Logged-in  → disabled "coming soon"; actual persistence needs the
 *                /profil child-management stage, not this one.
 */
import { useState } from "react";
import Link from "next/link";
import { Bookmark } from "lucide-react";

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
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export function SaveHistoryButton({ isLoggedIn }: { isLoggedIn: boolean }) {
  const [open, setOpen] = useState(false);

  if (isLoggedIn) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          {/* span wrapper keeps the disabled Button hoverable for the tooltip */}
          <span className="inline-flex">
            <Button variant="outline" disabled className="gap-2">
              <Bookmark className="size-4" strokeWidth={1.5} aria-hidden />
              Simpan ke Riwayat Tumbuh
            </Button>
          </span>
        </TooltipTrigger>
        <TooltipContent>
          Fitur simpan ke riwayat akan hadir segera
        </TooltipContent>
      </Tooltip>
    );
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <Bookmark className="size-4" strokeWidth={1.5} aria-hidden />
          Simpan ke Riwayat Tumbuh
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Masuk untuk menyimpan hasil ini</DialogTitle>
          <DialogDescription>
            Riwayat tumbuh kembang membutuhkan akun agar data pengukuran si
            kecil tersimpan aman dan bisa dipantau tiap bulan.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="flex-col gap-2 sm:flex-col">
          <Button asChild className="w-full">
            <Link href="/login?next=/">Masuk dengan Google</Link>
          </Button>
          <p className="text-center text-[13px] text-muted-foreground">
            Anda akan menyetujui pengumpulan data di halaman masuk.
          </p>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
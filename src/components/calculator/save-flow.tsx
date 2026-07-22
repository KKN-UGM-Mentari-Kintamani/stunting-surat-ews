"use client";

/* src/components/calculator/save-flow.tsx
 * Save-to-riwayat entry from the home calculator (PRD §4.2A). Replaces the
 * old "segera hadir" SaveHistoryButton — now actually works with /profil.
 *
 * User flow:
 *   ──Guest──         → "Masuk untuk menyimpan" dialog → drafts form to
 *                       sessionStorage before the /login redirect; home restores
 *                       the form on `?restore=1` after login (see calculator-form).
 *   ──Logged-in, 0 anak→ "Tambah Anak dulu" dialog → /profil?new=1 deeplink.
 *   ──Logged-in, ≥1──  → choose-child dialog → measurement dialog prefilled
 *                       with this calculator's draft values → server action
 *                       re-computes Z-scores & sets status from tanggal_lahir.
 *
 * After success, the button flips to a muted "Tersimpan ke {nama}" + a
 * "Lihat di Profil" link to guard against accidental double-save.
 */
import { useState } from "react";
import Link from "next/link";
import { Bookmark, Check } from "lucide-react";

import { ChooseChildDialog } from "@/components/calculator/choose-child-dialog";
import { MeasurementDialog } from "@/app/profil/_components/measurement-dialog";
import type { ChildSummary } from "@/app/profil/_queries";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export interface SaveDraft {
  gender?: "male" | "female";
  ageMonths?: number;
  beratBadanKg: number;
  tinggiBadanCm: number;
  lingkarKepalaCm?: number;
  lingkarLenganCm?: number;
}

interface Props {
  isLoggedIn: boolean;
  anak: ChildSummary[];
  draft: SaveDraft;
}

const DRAFT_KEY = "stunting_draft";

export function SaveFlow({ isLoggedIn, anak, draft }: Props) {
  const [loginOpen, setLoginOpen] = useState(false);
  const [chooserOpen, setChooserOpen] = useState(false);
  const [picked, setPicked] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const [savedName, setSavedName] = useState<string | null>(null);

  function handlePrimaryClick() {
    if (!isLoggedIn) {
      setLoginOpen(true);
      return;
    }
    setChooserOpen(true);
  }

  function handlePick(childId: string, childName: string) {
    setPicked({ id: childId, name: childName });
    setChooserOpen(false);
  }

  function handleSaved() {
    if (picked) setSavedName(picked.name);
    setPicked(null);
  }

  if (savedName) {
    return (
      <div className="flex items-center gap-3">
        <span className="inline-flex items-center gap-2 rounded-md border border-status-normal-fg/30 bg-status-normal-bg px-3 py-2 text-[15px] font-medium text-status-normal-fg">
          <Check className="size-4" strokeWidth={1.5} aria-hidden />
          Tersimpan ke {savedName}
        </span>
        <Link
          href="/profil"
          className="text-[15px] font-medium text-secondary underline-offset-4 hover:underline"
        >
          Lihat di Profil
        </Link>
      </div>
    );
  }

  return (
    <>
      <Button variant="default" className="gap-2" onClick={handlePrimaryClick}>
        <Bookmark className="size-4" strokeWidth={1.5} aria-hidden />
        Simpan ke Riwayat Tumbuh
      </Button>

      {/* Guest: prompt login + stash a draft for restore after callback. */}
      <Dialog open={loginOpen} onOpenChange={setLoginOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Masuk untuk menyimpan hasil ini</DialogTitle>
            <DialogDescription>
              Riwayat tumbuh kembang membutuhkan akun agar data pengukuran si
              kecil tersimpan aman dan bisa dipantau tiap bulan. Isian Anda akan
              dipulihkan setelah masuk.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex-col gap-2 sm:flex-col">
            <Button asChild className="w-full">
              <Link
                href="/login?next=/"
                onClick={() => {
                  try {
                    sessionStorage.setItem(
                      DRAFT_KEY,
                      JSON.stringify({
                        ...draft,
                        ts: Date.now(),
                      }),
                    );
                  } catch {
                    // sessionStorage can be blocked (private mode) — accept silent fail
                  }
                }}
              >
                Masuk dengan Google
              </Link>
            </Button>
            <p className="text-center text-[13px] text-muted-foreground">
              Anda akan menyetujui pengumpulan data di halaman masuk.
            </p>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {isLoggedIn && (
        <ChooseChildDialog
          open={chooserOpen}
          onOpenChange={setChooserOpen}
          anak={anak}
          onPick={handlePick}
        />
      )}

      {isLoggedIn && picked && (
        <MeasurementDialog
          childId={picked.id}
          childName={picked.name}
          open={!!picked}
          onOpenChange={(o) => {
            if (!o) setPicked(null);
          }}
          defaults={{
            beratBadanKg: draft.beratBadanKg,
            tinggiBadanCm: draft.tinggiBadanCm,
            lingkarKepalaCm: draft.lingkarKepalaCm,
            lingkarLenganCm: draft.lingkarLenganCm,
          }}
          onSaved={handleSaved}
        />
      )}
    </>
  );
}
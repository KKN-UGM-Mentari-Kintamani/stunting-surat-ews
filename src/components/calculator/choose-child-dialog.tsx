"use client";

/* src/components/calculator/choose-child-dialog.tsx
 * Dialog pemilih anak saat user login mengklik "Simpan ke Riwayat" dari Home.
 * Anak di luar rentang WHO (umur sekarang > 60 bln) tetap muncul namun
 * disabled dengan penanda, sesuai Q4 "tetap tampil di /profil".
 */
import Link from "next/link";
import { Plus } from "lucide-react";

import type { ChildSummary } from "@/app/profil/_queries";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  anak: ChildSummary[];
  onPick: (childId: string, childName: string) => void;
}

function genderWord(jk: "L" | "P"): string {
  return jk === "L" ? "Laki-laki" : "Perempuan";
}

export function ChooseChildDialog({
  open,
  onOpenChange,
  anak: list,
  onPick,
}: Props) {
  const selectable = list.filter((c) => c.inRange);
  const outOfRange = list.filter((c) => !c.inRange);
  const noChildren = list.length === 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Pilih Anak</DialogTitle>
          <DialogDescription>
            Simpan hasil kalkulator ke profil anak yang sesuai.
          </DialogDescription>
        </DialogHeader>

        {noChildren ? (
          <div className="flex flex-col items-center gap-4 py-6 text-center">
            <p className="text-[15px] leading-relaxed text-muted-foreground">
              Anda belum mendaftarkan anak. Tambah profil anak dulu, lalu kembali
              menyimpan hasil ini.
            </p>
            <Button asChild variant="default" className="gap-2">
              <Link href="/profil?new=1">
                <Plus className="size-4" strokeWidth={1.5} aria-hidden />
                Tambah Anak
              </Link>
            </Button>
          </div>
        ) : (
          <RadioGroup
            onValueChange={(v) => {
              const c = selectable.find((x) => x.id === v);
              if (c) onPick(c.id, c.nama_anak);
            }}
          >
            <div className="flex flex-col gap-3">
              {selectable.map((c) => (
                <Field orientation="horizontal" key={c.id}>
                  <RadioGroupItem
                    id={`child-${c.id}`}
                    value={c.id}
                    className="mt-1"
                  />
                  <div className="flex flex-col gap-0.5">
                    <FieldLabel
                      htmlFor={`child-${c.id}`}
                      className="text-[15px] font-medium leading-snug"
                    >
                      {c.nama_anak}
                    </FieldLabel>
                    <FieldDescription>
                      {genderWord(c.jenis_kelamin)} ·{" "}
                      <span className="tabular-data">{c.ageMonthsNow}</span>{" "}
                      bulan
                    </FieldDescription>
                  </div>
                </Field>
              ))}

              {outOfRange.length > 0 && (
                <Alert className="mt-2">
                  <AlertDescription>
                    {outOfRange.length} anak di luar rentang WHO (0–60 bulan)
                    — tidak dipertimbangkan untuk simpan.
                  </AlertDescription>
                </Alert>
              )}
            </div>
          </RadioGroup>
        )}

        <DialogFooter className="flex-col gap-2 sm:flex-col">
          <Button asChild variant="outline" className="w-full">
            <Link href="/profil?new=1" className="gap-2">
              <Plus className="size-4" strokeWidth={1.5} aria-hidden />
              Tambah Anak Baru
            </Link>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
"use client";

/* src/app/profil/_components/consent-gate.tsx
 * PDP Law consent gate (PRD §4.4). Until the user explicitly accepts, the
 * child-management UI is hidden and only this explanatory card appears. The
 * checkbox is never pre-checked (PDP requirement), and the warning is shown
 * via the shadcn Alert component, not custom styled divs (skill rule).
 */
import { useState, useTransition } from "react";
import { ShieldCheck } from "lucide-react";

import { acceptConsentAction } from "@/app/profil/_actions";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldLabel,
} from "@/components/ui/field";

export function ConsentGate() {
  const [agree, setAgree] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleAccept() {
    setError(null);
    startTransition(async () => {
      const res = await acceptConsentAction();
      if (!res.ok) setError(res.error);
    });
  }

  return (
    <Alert>
      <ShieldCheck aria-hidden />
      <AlertTitle>Persetujuan pengumpulan data</AlertTitle>
      <AlertDescription>
        Sebelum mendaftarkan anak dan menyimpan riwayat pengukuran, Anda perlu
        menyetujui pengumpulan &amp; penggunaan data. Data mencakup profil anak
        (nama, tanggal lahir) dan hasil pengukuran; dipakai untuk pemantauan
        tumbuh kembang dan — pada layanan surat nanti — NIK/KK. Data tidak
        dibagikan ke pihak lain dan dapat diminta dihapus melalui perangkat desa.
      </AlertDescription>

      <div className="mt-4 flex flex-col gap-3">
        <Field orientation="horizontal" className="items-start">
          <Checkbox
            id="consent"
            checked={agree}
            onCheckedChange={(v) => setAgree(v === true)}
            className="mt-1"
          />
          <FieldContent>
            <FieldLabel htmlFor="consent" className="text-[15px] font-medium leading-snug">
              Saya menyetujui pengumpulan &amp; penggunaan data
            </FieldLabel>
            <FieldDescription className="text-[13px] leading-relaxed">
              Persetujuan ini dicatat dengan stempel waktu pada akun Anda.
            </FieldDescription>
          </FieldContent>
        </Field>

        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <Button
          variant="default"
          disabled={!agree || isPending}
          onClick={handleAccept}
        >
          {isPending ? "Menyimpan…" : "Saya Setuju"}
        </Button>
      </div>
    </Alert>
  );
}
"use client";

/* src/components/consent/consent-gate.tsx
 * PDP Law consent gate (PRD §4.4, Master Doc §4). Until the user explicitly
 * accepts, features that need personal data stay hidden and only this card
 * appears. Shared by /profil and /layanan-surat so the consent is recorded
 * exactly once (users.consent_given_at). The checkbox is never pre-checked
 * (PDP requirement). `onAccepted` is called after the DB write succeeds so
 * the host page can refresh and continue its flow.
 */
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
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

export function ConsentGate({ onAccepted }: { onAccepted?: () => void }) {
  const router = useRouter();
  const [agree, setAgree] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleAccept() {
    setError(null);
    startTransition(async () => {
      const res = await acceptConsentAction();
      if (!res.ok) {
        setError(res.error);
        return;
      }
      onAccepted?.();
      router.refresh();
    });
  }

  return (
    <Alert>
      <ShieldCheck aria-hidden />
      <AlertTitle>Persetujuan pengumpulan data</AlertTitle>
      <AlertDescription>
        Sebelum mengakses layanan yang menyimpan data pribadi, Anda perlu
        menyetujui pengumpulan &amp; penggunaan data. Data mencakup profil
        anak (nama, tanggal lahir), hasil pengukuran, serta untuk layanan
        surat: NIK/KK dan alamat. Data dipakai untuk pemantauan tumbuh kembang
        dan administrasi desa, tidak dibagikan ke pihak lain, dan dapat diminta
        dihapus melalui perangkat desa.
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

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
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
    <Card>
      <CardHeader>
        <span className="mb-1 flex size-11 items-center justify-center rounded-full bg-primary/10">
          <ShieldCheck className="size-6 text-primary" strokeWidth={1.5} aria-hidden />
        </span>
        <CardTitle>Persetujuan Data</CardTitle>
        <CardDescription>
          Data Anda — profil anak, hasil pengukuran, dan NIK/KK untuk surat —
          dipakai untuk layanan desa, tidak dibagikan ke pihak lain, dan dapat
          diminta dihapus melalui perangkat desa.
        </CardDescription>
      </CardHeader>

      <CardContent className="flex flex-col gap-4">
        <Field orientation="horizontal" className="items-start">
          <Checkbox
            id="consent"
            checked={agree}
            onCheckedChange={(v) => setAgree(v === true)}
            className="mt-0.5"
          />
          <FieldContent>
            <FieldLabel htmlFor="consent" className="text-[15px] font-medium leading-snug">
              Saya menyetujui penggunaan data saya
            </FieldLabel>
            <FieldDescription className="text-[13px] leading-relaxed">
              Disimpan dengan stempel waktu di akun Anda.
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
          size="lg"
          className="w-full"
          disabled={!agree || isPending}
          onClick={handleAccept}
        >
          {isPending ? "Menyimpan…" : "Saya Setuju"}
        </Button>
      </CardContent>
    </Card>
  );
}

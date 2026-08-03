"use client";

/* src/app/layanan-surat/_components/letter-request-form.tsx
 * Smart form (PRD §4.1): select letter type → autofill from profil → editable
 * (family feature) → service-specific fields → preview → submit.
 */
import { useState, useTransition } from "react";
import { ArrowLeft, ArrowRight, FileText, Loader2 } from "lucide-react";

import { submitPermohonanAction } from "@/app/layanan-surat/_actions";
import type { WargaProfilData } from "@/lib/surat/types";
import { buildSnapshot } from "@/lib/surat/snapshot";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { LetterPreview } from "@/app/layanan-surat/_components/letter-preview";

interface JenisSurat {
  id: string;
  nama_surat: string;
  kode_klasifikasi: string;
}

interface Props {
  profil: WargaProfilData;
  jenisSuratList: JenisSurat[];
  onSubmitted: () => void;
}

type Step = "form" | "preview";

const labelClass = "text-[15px] font-medium leading-snug";

export function LetterRequestForm({ profil, jenisSuratList, onSubmitted }: Props) {
  const [step, setStep] = useState<Step>("form");
  const [jenisId, setJenisId] = useState("");
  const [nama, setNama] = useState(profil.nama);
  const [nik, setNik] = useState(profil.nik);
  const [namaUsaha, setNamaUsaha] = useState("");
  const [jenisUsaha, setJenisUsaha] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, start] = useTransition();

  const selectedType = jenisSuratList.find((j) => j.id === jenisId);
  const isSKU = selectedType?.kode_klasifikasi === "474";

  function handlePreview() {
    if (!jenisId || !nama.trim() || nik.length !== 16) {
      setError("Pilih jenis surat dan lengkapi NIK (16 digit) serta nama.");
      return;
    }
    setError(null);
    setStep("preview");
  }

  function handleSubmit() {
    setError(null);
    const dataKhusus = isSKU ? { nama_usaha: namaUsaha, jenis_usaha: jenisUsaha } : undefined;
    const snapshot = buildSnapshot(
      { ...profil, nama, nik },
      dataKhusus,
    );
    start(async () => {
      const res = await submitPermohonanAction(jenisId, snapshot);
      if (!res.ok) {
        setError(res.error);
        setStep("form");
        return;
      }
      onSubmitted();
      setStep("form");
      setJenisId("");
      setNama(profil.nama);
      setNik(profil.nik);
      setNamaUsaha("");
      setJenisUsaha("");
    });
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
          <FileText className="size-6 text-primary" strokeWidth={1.5} aria-hidden />
          <CardTitle>{step === "preview" ? "Pratinjau Surat" : "Ajukan Surat"}</CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        {step === "form" && (
          <form
            onSubmit={(e) => { e.preventDefault(); handlePreview(); }}
            noValidate
            className="flex flex-col gap-5"
          >
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="jenis" className={labelClass}>Jenis Surat <span className="text-destructive">*</span></FieldLabel>
                <Select value={jenisId} onValueChange={setJenisId}>
                  <SelectTrigger id="jenis" aria-invalid={!jenisId} className="w-full">
                    <SelectValue placeholder="Pilih jenis surat" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      {jenisSuratList.map((j) => (
                        <SelectItem key={j.id} value={j.id}>{j.nama_surat}</SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </Field>

              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                <Field>
                  <FieldLabel htmlFor="f-nama" className={labelClass}>Nama Pemohon <span className="text-destructive">*</span></FieldLabel>
                  <Input id="f-nama" value={nama} onChange={(e) => setNama(e.target.value)}
                    placeholder="Sesuai KTP / atas nama" />
                  <FieldDescription className="text-[13px] text-muted-foreground">
                    Bisa diubah untuk atas nama anggota keluarga.
                  </FieldDescription>
                </Field>
                <Field>
                  <FieldLabel htmlFor="f-nik" className={labelClass}>NIK <span className="text-destructive">*</span></FieldLabel>
                  <Input id="f-nik" value={nik} onChange={(e) => setNik(e.target.value)}
                    maxLength={16} inputMode="numeric" placeholder="16 digit" />
                </Field>
              </div>

              {isSKU && (
                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                  <Field>
                    <FieldLabel htmlFor="f-usaha" className={labelClass}>Nama Usaha <span className="text-destructive">*</span></FieldLabel>
                    <Input id="f-usaha" value={namaUsaha} onChange={(e) => setNamaUsaha(e.target.value)}
                      placeholder="Contoh: Warung Bu Sari" />
                  </Field>
                  <Field>
                    <FieldLabel htmlFor="f-jenis" className={labelClass}>Jenis Usaha <span className="text-destructive">*</span></FieldLabel>
                    <Input id="f-jenis" value={jenisUsaha} onChange={(e) => setJenisUsaha(e.target.value)}
                      placeholder="Contoh: Dagangan" />
                  </Field>
                </div>
              )}
            </FieldGroup>

            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <Button type="submit" disabled={!jenisId} className="gap-2">
              Lihat Pratinjau
              <ArrowRight className="size-4" strokeWidth={1.5} aria-hidden />
            </Button>
          </form>
        )}

        {step === "preview" && (
          <div className="flex flex-col gap-5">
            <LetterPreview
              namaSurat={selectedType?.nama_surat ?? "—"}
              snapshot={buildSnapshot(
                { ...profil, nama, nik },
                isSKU ? { nama_usaha: namaUsaha, jenis_usaha: jenisUsaha } : undefined,
              )}
            />

            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={() => setStep("form")} disabled={isPending} className="gap-2">
                <ArrowLeft className="size-4" strokeWidth={1.5} aria-hidden />
                Kembali Edit
              </Button>
              <Button onClick={handleSubmit} disabled={isPending} className="gap-2">
                {isPending && <Loader2 className="animate-spin" aria-hidden />}
                Ajukan Surat
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
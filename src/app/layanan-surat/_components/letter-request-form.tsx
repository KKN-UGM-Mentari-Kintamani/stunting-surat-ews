"use client";

/* src/app/layanan-surat/_components/letter-request-form.tsx
 * Smart form (PRD §4.1): select letter type → autofill from profil → editable
 * (family feature) → service-specific fields → preview → submit.
 */
import { useRef, useState, useTransition } from "react";
import { ArrowLeft, ArrowRight, FileText, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { submitPermohonanAction } from "@/app/layanan-surat/_actions";
import type { KadesConfig, TemplateKey, WargaProfilData } from "@/lib/surat/types";
import { buildSnapshot } from "@/lib/surat/snapshot";
import { FIELD_DEFS, requiredKeys } from "@/lib/surat/fields";
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
import { Checkbox } from "@/components/ui/checkbox";
import { RequiredMark } from "@/components/ui/required-mark";
import { LetterPreview } from "@/app/layanan-surat/_components/letter-preview";

interface JenisSurat {
  id: string;
  nama_surat: string;
  kode_klasifikasi: string;
  template_key: TemplateKey;
}

interface Props {
  profil: WargaProfilData;
  jenisSuratList: JenisSurat[];
  kades?: KadesConfig | null;
  onSubmitted: () => void;
}

type Step = "form" | "preview";

const labelClass = "text-[15px] font-medium leading-snug";

export function LetterRequestForm({ profil, jenisSuratList, kades, onSubmitted }: Props) {
  const [step, setStep] = useState<Step>("form");
  const [jenisId, setJenisId] = useState("");
  const [nama, setNama] = useState(profil.nama);
  const [nik, setNik] = useState(profil.nik);
  const [tempatLahir, setTempatLahir] = useState(profil.tempat_lahir);
  const [tanggalLahir, setTanggalLahir] = useState(profil.tanggal_lahir);
  const [jenisKelamin, setJenisKelamin] = useState<"L" | "P">(profil.jenis_kelamin);
  const [agama, setAgama] = useState(profil.agama);
  const [pekerjaan, setPekerjaan] = useState(profil.pekerjaan);
  const [alamat, setAlamat] = useState(profil.alamat);
  const [dataKhusus, setDataKhusus] = useState<Record<string, string>>({});
  // Admin consideration inputs (shown to the verifier).
  const [tujuan, setTujuan] = useState("");
  const [telepon, setTelepon] = useState("");
  const [pernyataan, setPernyataan] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, start] = useTransition();
  const submittingRef = useRef(false);

  const selectedType = jenisSuratList.find((j) => j.id === jenisId);
  const templateKey = selectedType?.template_key;
  const fields = templateKey ? FIELD_DEFS[templateKey] : [];

  function setField(key: string, value: string) {
    setDataKhusus((prev) => ({ ...prev, [key]: value }));
  }

  function handlePreview() {
    if (!jenisId || !nama.trim() || nik.length !== 16) {
      setError("Pilih jenis surat dan lengkapi NIK (16 digit) serta nama.");
      return;
    }
    if (!tempatLahir.trim() || !tanggalLahir.trim()) {
      setError("Lengkapi tempat dan tanggal lahir pemohon.");
      return;
    }
    if (!agama.trim() || !pekerjaan.trim() || !alamat.trim()) {
      setError("Lengkapi agama, pekerjaan, dan alamat pemohon.");
      return;
    }
    if (!tujuan.trim()) {
      setError("Isi tujuan permohonan surat.");
      return;
    }
    if (telepon.trim() && !/^[0-9+\s-]{8,16}$/.test(telepon.trim())) {
      setError("Nomor telepon tidak valid (8–16 digit).");
      return;
    }
    if (!pernyataan) {
      setError("Centang pernyataan tanggung jawab untuk melanjutkan.");
      return;
    }
    const missing = (templateKey ? requiredKeys(templateKey) : []).filter(
      (k) => !(dataKhusus[k] ?? "").trim(),
    );
    if (missing.length > 0) {
      setError("Lengkapi semua isian khusus surat yang wajib.");
      return;
    }
    setError(null);
    setStep("preview");
  }

  function handleSubmit() {
    if (submittingRef.current) return; // guard double-submit
    setError(null);
    submittingRef.current = true;
    const snapshot = buildSnapshot(
      { ...profil, nama, nik, tempat_lahir: tempatLahir, tanggal_lahir: tanggalLahir, jenis_kelamin: jenisKelamin, agama, pekerjaan, alamat },
      {
        dataKhusus,
        tujuanPermohonan: tujuan.trim(),
        nomorTelepon: telepon.trim() || undefined,
        pernyataanBenar: pernyataan,
      },
    );
    start(async () => {
      try {
        const res = await submitPermohonanAction(jenisId, snapshot);
        if (!res.ok) {
          setError(res.error);
          toast.error("Gagal mengajukan surat.", { description: res.error });
          setStep("form");
          return;
        }
        toast.success("Surat berhasil diajukan.", {
          description: "Tunggu verifikasi perangkat desa.",
        });
        onSubmitted();
        setStep("form");
        setJenisId("");
        setNama(profil.nama);
        setNik(profil.nik);
        setTempatLahir(profil.tempat_lahir);
        setTanggalLahir(profil.tanggal_lahir);
        setJenisKelamin(profil.jenis_kelamin);
        setAgama(profil.agama);
        setPekerjaan(profil.pekerjaan);
        setAlamat(profil.alamat);
        setDataKhusus({});
        setTujuan("");
        setTelepon("");
        setPernyataan(false);
      } finally {
        submittingRef.current = false;
      }
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
                <FieldLabel htmlFor="jenis" className={labelClass}>Jenis Surat <RequiredMark /></FieldLabel>
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
                  <FieldLabel htmlFor="f-nama" className={labelClass}>Nama Lengkap Pemohon<RequiredMark /></FieldLabel>
                  <Input id="f-nama" value={nama} onChange={(e) => setNama(e.target.value)}
                    placeholder="Sesuai KTP / atas nama" />
                  {/* <FieldDescription className="text-[13px] text-muted-foreground">
                    Bisa diubah untuk atas nama anggota keluarga.
                  </FieldDescription> */}
                </Field>
                <Field>
                  <FieldLabel htmlFor="f-nik" className={labelClass}>NIK <RequiredMark /></FieldLabel>
                  <Input id="f-nik" value={nik} onChange={(e) => setNik(e.target.value)}
                    maxLength={16} inputMode="numeric" placeholder="16 digit" />
                </Field>
                <Field>
                  <FieldLabel htmlFor="f-tempat-lahir" className={labelClass}>Tempat Lahir <RequiredMark /></FieldLabel>
                  <Input id="f-tempat-lahir" value={tempatLahir} onChange={(e) => setTempatLahir(e.target.value)}
                    placeholder="Contoh: Denpasar" />
                </Field>
                <Field>
                  <FieldLabel htmlFor="f-tanggal-lahir" className={labelClass}>Tanggal Lahir <RequiredMark /></FieldLabel>
                  <Input id="f-tanggal-lahir" type="date"
                    max={new Date().toISOString().slice(0, 10)}
                    value={tanggalLahir} onChange={(e) => setTanggalLahir(e.target.value)} />
                </Field>
                <Field>
                  <FieldLabel htmlFor="f-jk" className={labelClass}>Jenis Kelamin <RequiredMark /></FieldLabel>
                  <Select value={jenisKelamin} onValueChange={(v) => setJenisKelamin(v as "L" | "P")}>
                    <SelectTrigger id="f-jk" className="w-full"><SelectValue placeholder="Pilih" /></SelectTrigger>
                    <SelectContent><SelectGroup>
                      <SelectItem value="L">Laki-laki</SelectItem>
                      <SelectItem value="P">Perempuan</SelectItem>
                    </SelectGroup></SelectContent>
                  </Select>
                </Field>
                <Field>
                  <FieldLabel htmlFor="f-agama" className={labelClass}>Agama <RequiredMark /></FieldLabel>
                  <Select value={agama} onValueChange={setAgama}>
                    <SelectTrigger id="f-agama" className="w-full"><SelectValue placeholder="Pilih" /></SelectTrigger>
                    <SelectContent><SelectGroup>
                      {["Islam","Kristen","Katolik","Hindu","Buddha","Konghucu"].map((a) => (
                        <SelectItem key={a} value={a}>{a}</SelectItem>
                      ))}
                    </SelectGroup></SelectContent>
                  </Select>
                </Field>
                <Field>
                  <FieldLabel htmlFor="f-pekerjaan" className={labelClass}>Pekerjaan <RequiredMark /></FieldLabel>
                  <Input id="f-pekerjaan" value={pekerjaan} onChange={(e) => setPekerjaan(e.target.value)}
                    placeholder="Contoh: Petani" />
                </Field>
                <Field>
                  <FieldLabel htmlFor="f-alamat" className={labelClass}>Alamat (Nama Banjar) <RequiredMark /></FieldLabel>
                  <Input id="f-alamat" value={alamat} onChange={(e) => setAlamat(e.target.value)}
                    placeholder="Contoh: Br. Dalem" />
                  <FieldDescription className="text-[13px] text-muted-foreground">
                    Cukup isi nama Banjar (mis. &quot;Br. Dalem&quot;). Sisanya (Desa
                    Songan B, Kecamatan Kintamani, Kabupaten Bangli) ditambahkan
                    otomatis pada surat.
                  </FieldDescription>
                </Field>
              </div>

              {fields.length > 0 && (
                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                  {fields.map((f) => (
                    <Field key={f.key}>
                      <FieldLabel htmlFor={`f-${f.key}`} className={labelClass}>
                        {f.label}{f.required && <RequiredMark />}
                      </FieldLabel>
                      {f.type === "select" ? (
                        <Select value={dataKhusus[f.key] ?? ""} onValueChange={(v) => setField(f.key, v)}>
                          <SelectTrigger id={`f-${f.key}`} className="w-full">
                            <SelectValue placeholder="Pilih" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectGroup>
                              {(f.options ?? []).map((o) => (
                                <SelectItem key={o} value={o}>{o}</SelectItem>
                              ))}
                            </SelectGroup>
                          </SelectContent>
                        </Select>
                      ) : (
                        <Input
                          id={`f-${f.key}`}
                          value={dataKhusus[f.key] ?? ""}
                          onChange={(e) => {
                            let v = e.target.value;
                            if (f.type === "year") v = v.replace(/\D/g, "").slice(0, 4);
                            setField(f.key, v);
                          }}
                          inputMode={f.type === "year" ? "numeric" : undefined}
                          maxLength={f.type === "year" ? 4 : undefined}
                          placeholder={f.placeholder}
                        />
                      )}
                    </Field>
                  ))}
                </div>
              )}
              {templateKey === "sktm" && (
                <p className="text-[13px] text-muted-foreground">
                  Tujuan SKTM yang tertulis pada surat akan ditentukan perangkat desa saat verifikasi.
                </p>
              )}

              {/* Administrative consideration inputs (shown to the verifier admin) */}
              <div className="mt-1 border-t border-border pt-4">
                {/* <p className="mb-3 text-[13px] font-medium text-muted-foreground">
                  Data ini digunakan perangkat desa untuk menilai permohonan Anda.
                </p> */}
                <Field>
                  <FieldLabel htmlFor="f-tujuan" className={labelClass}>Tujuan Permohonan Surat <RequiredMark /></FieldLabel>
                  <Input id="f-tujuan" value={tujuan} onChange={(e) => setTujuan(e.target.value)}
                    placeholder="Contoh: Untuk pengajuan bantuan sosial" />
                </Field>
                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 mt-2">
                  <Field>
                    <FieldLabel htmlFor="f-telepon" className={labelClass}>Nomor Telepon</FieldLabel>
                    <Input id="f-telepon" value={telepon} onChange={(e) => setTelepon(e.target.value)}
                      inputMode="tel" placeholder="Contoh: 081234567890" />
                    {/* <FieldDescription className="text-[13px] text-muted-foreground">
                      Untuk konfirmasi jika diperlukan.
                    </FieldDescription> */}
                  </Field>
                </div>
                <Field orientation="horizontal" className="items-start">
                  <Checkbox
                    id="f-pernyataan"
                    checked={pernyataan}
                    onCheckedChange={(v) => setPernyataan(v === true)}
                    className="mt-4"
                  />
                  <div className="flex flex-col gap-1 mt-3">
                    <FieldLabel htmlFor="f-pernyataan" className={labelClass}>
                      Saya menyatakan data yang diisi adalah benar &amp; bertanggung jawab penuh <RequiredMark />
                    </FieldLabel>
                    <FieldDescription className="text-[13px] text-muted-foreground">
                      Pemberian keterangan tidak benar dapat dikenakan sanksi sesuai peraturan yang berlaku.
                    </FieldDescription>
                  </div>
                </Field>
              </div>
            </FieldGroup>

            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {/* Required logic mirrors handlePreview: jenis, nama, NIK, tujuan,
                pernyataan; plus SKU fields when the letter type is SKU. */}
            <Button
              type="submit"
              disabled={
                !jenisId ||
                !nama.trim() ||
                nik.length !== 16 ||
                !tempatLahir.trim() ||
                !tanggalLahir.trim() ||
                !agama.trim() ||
                !pekerjaan.trim() ||
                !alamat.trim() ||
                !tujuan.trim() ||
                !pernyataan ||
                (templateKey ? requiredKeys(templateKey) : []).some((k) => !(dataKhusus[k] ?? "").trim())
              }
              className="gap-2"
            >
              Lihat Pratinjau
              <ArrowRight className="size-4" strokeWidth={1.5} aria-hidden />
            </Button>
          </form>
        )}

        {step === "preview" && (
          <div className="flex flex-col gap-5">
            <LetterPreview
              namaSurat={selectedType?.nama_surat ?? "—"}
              templateKey={selectedType?.template_key ?? "sktm"}
              kades={kades}
              snapshot={buildSnapshot(
                { ...profil, nama, nik, tempat_lahir: tempatLahir, tanggal_lahir: tanggalLahir, jenis_kelamin: jenisKelamin, agama, pekerjaan, alamat },
                {
                  dataKhusus,
                  tujuanPermohonan: tujuan.trim(),
                  nomorTelepon: telepon.trim() || undefined,
                  pernyataanBenar: pernyataan,
                },
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
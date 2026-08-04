"use client";

/* src/app/admin/surat/_components/walk-in-form.tsx
 * Admin creates a letter for a walk-in citizen (no account). Manual KTP input
 * → preview (verify data) → createWalkInAction (user_id=NULL, admin_pembuat_id
 * set). Because the citizen is verified at the counter, the letter is
 * AUTO-APPROVED immediately after the admin confirms. On success a toast
 * confirms it and points to the queue; the form resets so the admin can serve
 * the next citizen right away.
 */
import { useState, useTransition } from "react";
import { ArrowLeft, ArrowRight, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { createWalkInAction } from "@/app/admin/surat/_actions";
import { buildSnapshot } from "@/lib/surat/snapshot";
import { emptyProfil } from "@/lib/surat/snapshot";
import type { IsianSnapshot, KadesConfig } from "@/lib/surat/types";
import { LetterPreview } from "@/app/layanan-surat/_components/letter-preview";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { RequiredMark } from "@/components/ui/required-mark";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface JenisSurat { id: string; nama_surat: string; kode_klasifikasi: string; }
const labelClass = "text-[15px] font-medium leading-snug";

type Step = "form" | "preview";

export function WalkInForm({ jenisSuratList, kades }: { jenisSuratList: JenisSurat[]; kades?: KadesConfig | null }) {
  const [step, setStep] = useState<Step>("form");
  const [jenisId, setJenisId] = useState("");
  const [nama, setNama] = useState("");
  const [nik, setNik] = useState("");
  const [tempatLahir, setTempatLahir] = useState("");
  const [tglLahir, setTglLahir] = useState("");
  const [agama, setAgama] = useState("");
  const [pekerjaan, setPekerjaan] = useState("");
  const [alamat, setAlamat] = useState("");
  const [noKk, setNoKk] = useState("");
  const [tujuan, setTujuan] = useState("");
  const [telepon, setTelepon] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, start] = useTransition();
  const [previewSnapshot, setPreviewSnapshot] = useState<IsianSnapshot | null>(null);

  const selectedType = jenisSuratList.find((j) => j.id === jenisId);
  const isSKU = selectedType?.kode_klasifikasi === "474";
  const [namaUsaha, setNamaUsaha] = useState("");
  const [jenisUsaha, setJenisUsaha] = useState("");

  function resetForm() {
    setJenisId("");
    setNama("");
    setNik("");
    setTempatLahir("");
    setTglLahir("");
    setAgama("");
    setPekerjaan("");
    setAlamat("");
    setNoKk("");
    setTujuan("");
    setTelepon("");
    setNamaUsaha("");
    setJenisUsaha("");
    setPreviewSnapshot(null);
    setStep("form");
  }

  function goToPreview(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!jenisId || nik.length !== 16 || !nama.trim()) {
      setError("Pilih jenis surat, isi NIK (16 digit) dan nama.");
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
    const profil = { ...emptyProfil(), nama, nik, no_kk: noKk, tempat_lahir: tempatLahir, tanggal_lahir: tglLahir, agama, pekerjaan, alamat };
    const dataKhusus = isSKU ? { nama_usaha: namaUsaha, jenis_usaha: jenisUsaha } : undefined;
    const snapshot = buildSnapshot(profil, {
      dataKhusus,
      tujuanPermohonan: tujuan.trim(),
      nomorTelepon: telepon.trim() || undefined,
      pernyataanBenar: true, // Admin confirmed identity at the counter.
    });
    setPreviewSnapshot(snapshot);
    setStep("preview");
  }

  function confirmAndPublish() {
    if (!jenisId || !previewSnapshot) return;
    setError(null);
    start(async () => {
      const res = await createWalkInAction(jenisId, previewSnapshot);
      if (!res.ok) { setError(res.error); return; }
      toast.success("Surat walk-in berhasil diterbitkan.", {
        description: "Surat langsung disetujui. Lihat di halaman antrian.",
      });
      resetForm();
    });
  }

  return (
    <Card className="max-w-2xl">
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <CardTitle>{step === "preview" ? "Pratinjau Surat" : "Data Warga"}</CardTitle>
          <Button asChild variant="outline" size="sm">
            <a href="/admin/surat">Lihat Antrian</a>
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {step === "preview" && previewSnapshot ? (
          <div className="flex flex-col gap-4">
            <LetterPreview
              namaSurat={selectedType?.nama_surat ?? "Surat"}
              snapshot={previewSnapshot}
              kades={kades}
            />
            {error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}
            <div className="flex items-center gap-2">
              <Button variant="outline" className="gap-1.5" onClick={() => setStep("form")} disabled={isPending}>
                <ArrowLeft className="size-4" strokeWidth={1.5} aria-hidden />
                Kembali Edit
              </Button>
              <Button onClick={confirmAndPublish} disabled={isPending} className="gap-1.5">
                {isPending && <Loader2 className="animate-spin" aria-hidden />}
                Buat & Terbitkan
                <ArrowRight className="size-4" strokeWidth={1.5} aria-hidden />
              </Button>
            </div>
          </div>
        ) : (
          <form onSubmit={goToPreview} noValidate className="flex flex-col gap-5">
            <FieldGroup>
              <Field>
                <FieldLabel className={labelClass}>Jenis Surat <RequiredMark /></FieldLabel>
                <Select value={jenisId} onValueChange={setJenisId}>
                  <SelectTrigger className="w-full"><SelectValue placeholder="Pilih jenis surat" /></SelectTrigger>
                  <SelectContent><SelectGroup>
                    {jenisSuratList.map((j) => <SelectItem key={j.id} value={j.id}>{j.nama_surat}</SelectItem>)}
                  </SelectGroup></SelectContent>
                </Select>
              </Field>
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                <Field><FieldLabel className={labelClass}>Nama Lengkap <RequiredMark /></FieldLabel>
                  <Input value={nama} onChange={(e) => setNama(e.target.value)} placeholder="Sesuai KTP" /></Field>
                <Field><FieldLabel className={labelClass}>NIK <RequiredMark /></FieldLabel>
                  <Input value={nik} onChange={(e) => setNik(e.target.value)} maxLength={16} inputMode="numeric" placeholder="16 digit" /></Field>
              </div>
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                <Field><FieldLabel className={labelClass}>No. KK</FieldLabel>
                  <Input value={noKk} onChange={(e) => setNoKk(e.target.value)} maxLength={16} inputMode="numeric" /></Field>
                <Field><FieldLabel className={labelClass}>Tempat Lahir</FieldLabel>
                  <Input value={tempatLahir} onChange={(e) => setTempatLahir(e.target.value)} /></Field>
              </div>
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                <Field><FieldLabel className={labelClass}>Tanggal Lahir</FieldLabel>
                  <Input type="date" value={tglLahir} onChange={(e) => setTglLahir(e.target.value)} max={new Date().toISOString().slice(0, 10)} /></Field>
                <Field><FieldLabel className={labelClass}>Agama</FieldLabel>
                  <Select value={agama} onValueChange={setAgama}>
                    <SelectTrigger className="w-full"><SelectValue placeholder="Pilih" /></SelectTrigger>
                    <SelectContent><SelectGroup>
                      {["Islam","Kristen","Katolik","Hindu","Buddha","Konghucu"].map((a) => <SelectItem key={a} value={a}>{a}</SelectItem>)}
                    </SelectGroup></SelectContent>
                  </Select>
                </Field>
              </div>
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                <Field><FieldLabel className={labelClass}>Pekerjaan</FieldLabel>
                  <Input value={pekerjaan} onChange={(e) => setPekerjaan(e.target.value)} /></Field>
                <Field><FieldLabel className={labelClass}>Alamat</FieldLabel>
                  <Input value={alamat} onChange={(e) => setAlamat(e.target.value)} /></Field>
              </div>
              {isSKU && (
                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                  <Field><FieldLabel className={labelClass}>Nama Usaha</FieldLabel>
                    <Input value={namaUsaha} onChange={(e) => setNamaUsaha(e.target.value)} /></Field>
                  <Field><FieldLabel className={labelClass}>Jenis Usaha</FieldLabel>
                    <Input value={jenisUsaha} onChange={(e) => setJenisUsaha(e.target.value)} /></Field>
                </div>
              )}

              {/* Administrative consideration inputs */}
              <div className="mt-1 border-t border-border pt-4">
                {/* <p className="mb-3 text-[13px] font-medium text-muted-foreground">
                  Data ini digunakan perangkat desa untuk menilai permohonan.
                </p> */}
                <Field><FieldLabel className={labelClass}>Tujuan Permohonan Surat <RequiredMark /></FieldLabel>
                  <Input value={tujuan} onChange={(e) => setTujuan(e.target.value)}
                    placeholder="Contoh: Untuk pengajuan bantuan sosial" /></Field>
                <Field><FieldLabel className={labelClass}>Nomor Telepon</FieldLabel>
                  <Input value={telepon} onChange={(e) => setTelepon(e.target.value)}
                    inputMode="tel" placeholder="Contoh: 081234567890" /></Field>
              </div>
            </FieldGroup>
            {error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}
            {/* Required logic mirrors goToPreview: jenis, nama, NIK, tujuan. */}
            <Button
              type="submit"
              disabled={!jenisId || !nama.trim() || nik.length !== 16 || !tujuan.trim()}
              className="gap-1.5 w-fit"
            >
              Lihat Pratinjau
              <ArrowRight className="size-4" strokeWidth={1.5} aria-hidden />
            </Button>
          </form>
        )}
      </CardContent>
    </Card>
  );
}
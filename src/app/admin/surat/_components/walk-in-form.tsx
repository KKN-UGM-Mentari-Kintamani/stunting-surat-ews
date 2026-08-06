"use client";

/* src/app/admin/surat/_components/walk-in-form.tsx
 * Admin creates a letter for a walk-in citizen (no account). Manual KTP input
 * → preview (verify data) → createWalkInAction (user_id=NULL, admin_pembuat_id
 * set). Because the citizen is verified at the counter, the letter is
 * AUTO-APPROVED immediately after the admin confirms. On success a toast
 * confirms it and points to the queue; the form resets so the admin can serve
 * the next citizen right away.
 *
 * Per-letter specific fields (jenis usaha, pindah domisili, nama ayah/ibu,
 * meninggal, dst) are rendered dynamically from FIELD_DEFS; for SKTM the admin
 * types the purpose phrase (tujuan_sktm) that appears in the final document.
 */
import { useRef, useState, useTransition } from "react";
import { ArrowLeft, ArrowRight, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { createWalkInAction } from "@/app/admin/surat/_actions";
import { buildSnapshot } from "@/lib/surat/snapshot";
import { emptyProfil } from "@/lib/surat/snapshot";
import { FIELD_DEFS, requiredKeys } from "@/lib/surat/fields";
import type { IsianSnapshot, KadesConfig, TemplateKey } from "@/lib/surat/types";
import { LetterPreview } from "@/app/layanan-surat/_components/letter-preview";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { RequiredMark } from "@/components/ui/required-mark";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface JenisSurat { id: string; nama_surat: string; kode_klasifikasi: string; template_key: TemplateKey; }
const labelClass = "text-[15px] font-medium leading-snug";

type Step = "form" | "preview";

export function WalkInForm({ jenisSuratList, kades }: { jenisSuratList: JenisSurat[]; kades?: KadesConfig | null }) {
  const [step, setStep] = useState<Step>("form");
  const [jenisId, setJenisId] = useState("");
  const [nama, setNama] = useState("");
  const [nik, setNik] = useState("");
  const [tempatLahir, setTempatLahir] = useState("");
  const [tglLahir, setTglLahir] = useState("");
  const [jenisKelamin, setJenisKelamin] = useState<"L" | "P">("L");
  const [status, setStatus] = useState("");
  const [kewarganegaraan, setKewarganegaraan] = useState("WNI");
  const [agama, setAgama] = useState("");
  const [pekerjaan, setPekerjaan] = useState("");
  const [alamat, setAlamat] = useState("");
  const [noKk, setNoKk] = useState("");
  const [tujuan, setTujuan] = useState("");
  const [telepon, setTelepon] = useState("");
  const [dataKhusus, setDataKhusus] = useState<Record<string, string>>({});
  const [tujuanSktm, setTujuanSktm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, start] = useTransition();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const submittingRef = useRef(false);
  const [previewSnapshot, setPreviewSnapshot] = useState<IsianSnapshot | null>(null);
  const [nomorSurat, setNomorSurat] = useState("");

  const selectedType = jenisSuratList.find((j) => j.id === jenisId);
  const templateKey = selectedType?.template_key;
  const fields = templateKey ? FIELD_DEFS[templateKey] : [];

  function resetForm() {
    setJenisId("");
    setNama("");
    setNik("");
    setTempatLahir("");
    setTglLahir("");
    setJenisKelamin("L");
    setStatus("");
    setKewarganegaraan("WNI");
    setAgama("");
    setPekerjaan("");
    setAlamat("");
    setNoKk("");
    setTujuan("");
    setTelepon("");
    setDataKhusus({});
    setTujuanSktm("");
    setNomorSurat("");
    setPreviewSnapshot(null);
    setStep("form");
  }

  function setField(key: string, value: string) {
    setDataKhusus((prev) => ({ ...prev, [key]: value }));
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
    if (templateKey === "sktm" && !tujuanSktm.trim()) {
      setError("Isi tujuan SKTM (akan tertulis pada surat).");
      return;
    }
    const missing = (templateKey ? requiredKeys(templateKey) : []).filter(
      (k) => !(dataKhusus[k] ?? "").trim(),
    );
    if (missing.length > 0) {
      setError("Lengkapi semua isian khusus surat yang wajib.");
      return;
    }
    const profil = { ...emptyProfil(), nama, nik, no_kk: noKk, tempat_lahir: tempatLahir, tanggal_lahir: tglLahir, jenis_kelamin: jenisKelamin, status, kewarganegaraan, agama, pekerjaan, alamat };
    const snapshot = buildSnapshot(profil, {
      dataKhusus,
      tujuanPermohonan: tujuan.trim(),
      nomorTelepon: telepon.trim() || undefined,
      pernyataanBenar: true, // Admin confirmed identity at the counter.
    });
    if (templateKey === "sktm") {
      snapshot.data_khusus = { ...snapshot.data_khusus, tujuan_sktm: tujuanSktm.trim() };
    }
    setPreviewSnapshot(snapshot);
    setStep("preview");
  }

  function confirmAndPublish() {
    if (!jenisId || !previewSnapshot) return;
    if (!nomorSurat.trim()) {
      setError("Nomor surat wajib diisi.");
      return;
    }
    if (isSubmitting) return; // guard double-submit
    submittingRef.current = true;
    setError(null);
    setIsSubmitting(true);
    start(async () => {
      try {
        const res = await createWalkInAction(jenisId, previewSnapshot, nomorSurat);
        if (!res.ok) { setError(res.error); return; }
        toast.success("Surat walk-in berhasil diterbitkan.", {
          description: "Surat langsung disetujui. Lihat di halaman antrian.",
        });
        resetForm();
      } finally {
        submittingRef.current = false;
        setIsSubmitting(false);
      }
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
              templateKey={templateKey ?? "sktm"}
              snapshot={previewSnapshot}
              kades={kades}
              nomorSurat={nomorSurat}
              tujuanSktmOverride={templateKey === "sktm" ? tujuanSktm : undefined}
            />
            <div className="flex flex-col gap-1">
              <label htmlFor="nomor-surat" className="text-[15px] font-medium leading-snug">
                Nomor Surat <RequiredMark />
              </label>
              <Input
                id="nomor-surat"
                value={nomorSurat}
                onChange={(e) => setNomorSurat(e.target.value)}
                placeholder="Contoh: 470/012/VII/2026"
              />
            </div>
            {error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}
            <div className="flex items-center gap-2">
              <Button variant="outline" className="gap-1.5" onClick={() => setStep("form")} disabled={isPending}>
                <ArrowLeft className="size-4" strokeWidth={1.5} aria-hidden />
                Kembali Edit
              </Button>
              <Button onClick={confirmAndPublish} disabled={isPending || isSubmitting} className="gap-1.5">
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
                <Select value={jenisId} onValueChange={(v) => { setJenisId(v); setDataKhusus({}); setTujuanSktm(""); }}>
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
                <Field><FieldLabel className={labelClass}>Jenis Kelamin</FieldLabel>
                  <Select value={jenisKelamin} onValueChange={(v) => setJenisKelamin(v as "L" | "P")}>
                    <SelectTrigger className="w-full"><SelectValue placeholder="Pilih" /></SelectTrigger>
                    <SelectContent><SelectGroup>
                      <SelectItem value="L">Laki-laki</SelectItem>
                      <SelectItem value="P">Perempuan</SelectItem>
                    </SelectGroup></SelectContent>
                  </Select>
                </Field>
              </div>
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                <Field><FieldLabel className={labelClass}>Status Perkawinan</FieldLabel>
                  <Select value={status} onValueChange={setStatus}>
                    <SelectTrigger className="w-full"><SelectValue placeholder="Pilih (opsional)" /></SelectTrigger>
                    <SelectContent><SelectGroup>
                      {["Belum Kawin","Kawin","Cerai Hidup","Cerai Mati"].map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                    </SelectGroup></SelectContent>
                  </Select>
                </Field>
                <Field><FieldLabel className={labelClass}>Kewarganegaraan</FieldLabel>
                  <Input value={kewarganegaraan} onChange={(e) => setKewarganegaraan(e.target.value)} placeholder="WNI" /></Field>
              </div>
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
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

              {/* Per-letter specific fields */}
              {templateKey === "sktm" && (
                <Field>
                  <FieldLabel className={labelClass}>Tujuan SKTM <RequiredMark /></FieldLabel>
                  <Input value={tujuanSktm} onChange={(e) => setTujuanSktm(e.target.value)}
                    placeholder="Frasa yang tertulis di surat, contoh: untuk administrasi mencari sekolah" />
                </Field>
              )}
              {fields.length > 0 && (
                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                  {fields.map((f) => (
                    <Field key={f.key}>
                      <FieldLabel className={labelClass}>
                        {f.label}{f.required && <RequiredMark />}
                      </FieldLabel>
                      {f.type === "select" ? (
                        <Select value={dataKhusus[f.key] ?? ""} onValueChange={(v) => setField(f.key, v)}>
                          <SelectTrigger className="w-full"><SelectValue placeholder="Pilih" /></SelectTrigger>
                          <SelectContent><SelectGroup>
                            {(f.options ?? []).map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                          </SelectGroup></SelectContent>
                        </Select>
                      ) : (
                        <Input
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

              {/* Administrative consideration inputs */}
              <div className="mt-1 border-t border-border pt-4">
                <Field><FieldLabel className={labelClass}>Tujuan Permohonan Surat <RequiredMark /></FieldLabel>
                  <Input value={tujuan} onChange={(e) => setTujuan(e.target.value)}
                    placeholder="Contoh: Untuk pengajuan bantuan sosial" /></Field>
                <Field><FieldLabel className={labelClass}>Nomor Telepon</FieldLabel>
                  <Input value={telepon} onChange={(e) => setTelepon(e.target.value)}
                    inputMode="tel" placeholder="Contoh: 081234567890" /></Field>
              </div>
            </FieldGroup>
            {error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}
            <Button
              type="submit"
              disabled={
                !jenisId ||
                !nama.trim() ||
                nik.length !== 16 ||
                !tujuan.trim() ||
                (templateKey === "sktm" && !tujuanSktm.trim()) ||
                (templateKey ? requiredKeys(templateKey) : []).some((k) => !(dataKhusus[k] ?? "").trim())
              }
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

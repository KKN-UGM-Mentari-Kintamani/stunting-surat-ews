"use client";

/* src/app/admin/surat/_components/walk-in-form.tsx
 * Admin creates a letter for a walk-in citizen (no account). Manual KTP input
 * → createWalkInAction (user_id=NULL, admin_pembuat_id set).
 */
import { useState, useTransition } from "react";
import { Loader2 } from "lucide-react";

import { createWalkInAction } from "@/app/admin/surat/_actions";
import { buildSnapshot } from "@/lib/surat/snapshot";
import { emptyProfil } from "@/lib/surat/snapshot";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface JenisSurat { id: string; nama_surat: string; kode_klasifikasi: string; }
const labelClass = "text-[15px] font-medium leading-snug";

export function WalkInForm({ jenisSuratList }: { jenisSuratList: JenisSurat[] }) {
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
  const [done, setDone] = useState(false);
  const [isPending, start] = useTransition();

  const selectedType = jenisSuratList.find((j) => j.id === jenisId);
  const isSKU = selectedType?.kode_klasifikasi === "474";
  const [namaUsaha, setNamaUsaha] = useState("");
  const [jenisUsaha, setJenisUsaha] = useState("");

  function submit(e: React.FormEvent) {
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
    start(async () => {
      const res = await createWalkInAction(jenisId, snapshot);
      if (!res.ok) { setError(res.error); return; }
      setDone(true);
    });
  }

  if (done) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
          <p className="text-[16px] font-medium text-status-normal-fg">Surat walk-in berhasil dibuat. Masuk ke antrian persetujuan.</p>
          <Button asChild variant="outline"><a href="/admin/surat">Lihat Antrian</a></Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="max-w-2xl">
      <CardHeader><CardTitle>Data Warga</CardTitle></CardHeader>
      <CardContent>
        <form onSubmit={submit} noValidate className="flex flex-col gap-5">
          <FieldGroup>
            <Field>
              <FieldLabel className={labelClass}>Jenis Surat *</FieldLabel>
              <Select value={jenisId} onValueChange={setJenisId}>
                <SelectTrigger className="w-full"><SelectValue placeholder="Pilih jenis surat" /></SelectTrigger>
                <SelectContent><SelectGroup>
                  {jenisSuratList.map((j) => <SelectItem key={j.id} value={j.id}>{j.nama_surat}</SelectItem>)}
                </SelectGroup></SelectContent>
              </Select>
            </Field>
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <Field><FieldLabel className={labelClass}>Nama Lengkap *</FieldLabel>
                <Input value={nama} onChange={(e) => setNama(e.target.value)} placeholder="Sesuai KTP" /></Field>
              <Field><FieldLabel className={labelClass}>NIK *</FieldLabel>
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
              <p className="mb-3 text-[13px] font-medium text-muted-foreground">
                Data ini digunakan perangkat desa untuk menilai permohonan.
              </p>
              <Field><FieldLabel className={labelClass}>Tujuan Permohonan Surat *</FieldLabel>
                <Input value={tujuan} onChange={(e) => setTujuan(e.target.value)}
                  placeholder="Contoh: Untuk pengajuan bantuan sosial" /></Field>
              <Field><FieldLabel className={labelClass}>Nomor Telepon</FieldLabel>
                <Input value={telepon} onChange={(e) => setTelepon(e.target.value)}
                  inputMode="tel" placeholder="Contoh: 081234567890" /></Field>
            </div>
          </FieldGroup>
          {error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}
          <Button type="submit" disabled={isPending} className="gap-2 w-fit">
            {isPending && <Loader2 className="animate-spin" aria-hidden />}
            Buat & Masukkan Antrian
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
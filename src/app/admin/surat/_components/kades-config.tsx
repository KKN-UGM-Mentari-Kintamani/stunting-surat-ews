"use client";

/* src/app/admin/surat/_components/kades-config.tsx
 * Edit Kades identity + upload TTE (PNG transparent) to private bucket.
 * TTE is compressed client-side before upload.
 */
import { useState, useTransition } from "react";
import imageCompression from "browser-image-compression";
import { Loader2, Save, Upload } from "lucide-react";

import { updateKadesConfigAction, uploadTteAction } from "@/app/admin/surat/_actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface Config {
  nama_kades: string;
  nip_kades: string | null;
  jabatan: string | null;
  ttd_cap_url: string | null;
}

export function KadesConfig({ initialConfig }: { initialConfig: Config | null }) {
  const [nama, setNama] = useState(initialConfig?.nama_kades ?? "");
  const [nip, setNip] = useState(initialConfig?.nip_kades ?? "");
  const [jabatan, setJabatan] = useState(initialConfig?.jabatan ?? "Kepala Desa");
  const [ttePath, setTtePath] = useState(initialConfig?.ttd_cap_url ?? "");
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [saved, setSaved] = useState(false);
  const [isPending, start] = useTransition();

  async function handleTte(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    setUploading(true);
    try {
      const compressed = await imageCompression(file, {
        maxSizeMB: 1,
        maxWidthOrHeight: 800,
        useWebWorker: true,
      });
      const fd = new FormData();
      fd.append("file", compressed, compressed.name);
      const res = await uploadTteAction(fd);
      if (!res.ok) { setError(res.error); return; }
      setTtePath(res.path);
    } catch (err) {
      setError("Gagal mengompresi gambar.");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaved(false);
    start(async () => {
      const res = await updateKadesConfigAction({
        namaKades: nama,
        nipKades: nip,
        jabatan,
        ttdCapUrl: ttePath,
      });
      if (!res.ok) { setError(res.error); return; }
      setSaved(true);
    });
  }

  return (
    <Card className="max-w-2xl">
      <CardHeader><CardTitle>Identitas & Tanda Tangan</CardTitle></CardHeader>
      <CardContent>
        <form onSubmit={submit} className="flex flex-col gap-5">
          <FieldGroup>
            <Field>
              <FieldLabel className="text-[15px] font-medium">Nama Kepala Desa *</FieldLabel>
              <Input value={nama} onChange={(e) => setNama(e.target.value)} placeholder="Contoh: I Wayan Sujana" />
            </Field>
            <Field>
              <FieldLabel className="text-[15px] font-medium">NIP</FieldLabel>
              <Input value={nip} onChange={(e) => setNip(e.target.value)} placeholder="Opsional" />
            </Field>
            <Field>
              <FieldLabel className="text-[15px] font-medium">Jabatan</FieldLabel>
              <Input value={jabatan} onChange={(e) => setJabatan(e.target.value)} />
            </Field>
            <Field>
              <FieldLabel className="text-[15px] font-medium">Tanda Tangan / Stempel (TTE)</FieldLabel>
              <FieldDescription className="text-[13px] text-muted-foreground">
                Upload PNG transparan. Akan dikompresi otomatis. Disimpan di bucket private.
              </FieldDescription>
              {ttePath ? (
                <div className="flex items-center gap-3 mt-2">
                  <span className="text-[14px] text-muted-foreground">Terupload: {ttePath}</span>
                  <Button variant="outline" size="sm" disabled={uploading} onClick={() => document.getElementById("tte-input")?.click()}>
                    {uploading ? <Loader2 className="animate-spin" aria-hidden /> : <Upload className="size-4" strokeWidth={1.5} aria-hidden />}
                    Ganti
                  </Button>
                </div>
              ) : (
                <Button variant="outline" type="button" disabled={uploading} className="gap-2 mt-2" onClick={() => document.getElementById("tte-input")?.click()}>
                  {uploading ? <Loader2 className="animate-spin" aria-hidden /> : <Upload className="size-4" strokeWidth={1.5} aria-hidden />}
                  Upload TTE
                </Button>
              )}
              <input id="tte-input" type="file" accept="image/png" className="hidden" onChange={handleTte} />
            </Field>
          </FieldGroup>
          {error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}
          {saved && <p className="text-[14px] font-medium text-status-normal-fg">Konfigurasi tersimpan.</p>}
          <Button type="submit" disabled={isPending || !nama.trim()} className="gap-2 w-fit">
            {isPending ? <Loader2 className="animate-spin" aria-hidden /> : <Save className="size-4" strokeWidth={1.5} aria-hidden />}
            Simpan
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
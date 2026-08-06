"use client";

/* src/app/admin/surat/_components/kades-config.tsx
 * Edit Kades identity + upload TTE (PNG transparent) to private bucket.
 * TTE is compressed client-side before upload.
 */
import { useState, useTransition } from "react";
import imageCompression from "browser-image-compression";
import { Loader2, Save, Upload } from "lucide-react";
import { toast } from "sonner";

import { updateKadesConfigAction, uploadAsetTtdAction } from "@/app/admin/surat/_actions";
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
  stempel_url: string | null;
}

export function KadesConfig({ initialConfig }: { initialConfig: Config | null }) {
  const [nama, setNama] = useState(initialConfig?.nama_kades ?? "");
  const [nip, setNip] = useState(initialConfig?.nip_kades ?? "");
  const [jabatan, setJabatan] = useState(initialConfig?.jabatan ?? "Kepala Desa");
  const [ttePath, setTtePath] = useState(initialConfig?.ttd_cap_url ?? "");
  const [stempelPath, setStempelPath] = useState(initialConfig?.stempel_url ?? "");
  const [uploading, setUploading] = useState<"tte" | "stempel" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [isPending, start] = useTransition();

  async function handleUpload(jenis: "tte" | "stempel", e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    setUploading(jenis);
    try {
      const compressed = await imageCompression(file, {
        maxSizeMB: 1,
        maxWidthOrHeight: 800,
        useWebWorker: true,
      });
      const fd = new FormData();
      fd.append("file", compressed, compressed.name);
      const oldPath = jenis === "stempel" ? stempelPath : ttePath;
      const res = await uploadAsetTtdAction(jenis, fd, oldPath);
      if (!res.ok) { setError(res.error); return; }
      if (jenis === "stempel") setStempelPath(res.path);
      else setTtePath(res.path);
      toast.success(jenis === "stempel" ? "Stempel diunggah." : "Tanda tangan diunggah.", {
        description: "File lama otomatis dihapus. Simpan untuk menerapkan.",
      });
    } catch (err) {
      setError("Gagal mengompresi gambar.");
    } finally {
      setUploading(null);
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
        stempelUrl: stempelPath,
      });
      if (!res.ok) {
        setError(res.error);
        toast.error("Gagal menyimpan konfigurasi.", { description: res.error });
        return;
      }
      setSaved(true);
      toast.success("Konfigurasi tersimpan.", {
        description: "Identitas, tanda tangan & stempel diperbarui.",
      });
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
              <FieldLabel className="text-[15px] font-medium">Tanda Tangan (TTE)</FieldLabel>
              <FieldDescription className="text-[13px] text-muted-foreground">
                Upload PNG transparan. Akan dikompresi otomatis. Disimpan di bucket private.
              </FieldDescription>
              {ttePath ? (
                <div className="flex items-center gap-3 mt-2">
                  <span className="text-[14px] text-muted-foreground">Terupload: {ttePath}</span>
                  <Button variant="outline" size="sm" disabled={uploading === "tte"} onClick={() => document.getElementById("tte-input")?.click()}>
                    {uploading === "tte" ? <Loader2 className="animate-spin" aria-hidden /> : <Upload className="size-4" strokeWidth={1.5} aria-hidden />}
                    Ganti
                  </Button>
                </div>
              ) : (
                <Button variant="outline" type="button" disabled={uploading === "tte"} className="gap-2 mt-2" onClick={() => document.getElementById("tte-input")?.click()}>
                  {uploading === "tte" ? <Loader2 className="animate-spin" aria-hidden /> : <Upload className="size-4" strokeWidth={1.5} aria-hidden />}
                  Upload TTE
                </Button>
              )}
              <input id="tte-input" type="file" accept="image/png" className="hidden" onChange={(e) => handleUpload("tte", e)} />
            </Field>
            <Field>
              <FieldLabel className="text-[15px] font-medium">Stempel / Cap</FieldLabel>
              <FieldDescription className="text-[13px] text-muted-foreground">
                Upload PNG transparan (bulat). Stempel akan menimpa tanda tangan di PDF.
              </FieldDescription>
              {stempelPath ? (
                <div className="flex items-center gap-3 mt-2">
                  <span className="text-[14px] text-muted-foreground">Terupload: {stempelPath}</span>
                  <Button variant="outline" size="sm" disabled={uploading === "stempel"} onClick={() => document.getElementById("stempel-input")?.click()}>
                    {uploading === "stempel" ? <Loader2 className="animate-spin" aria-hidden /> : <Upload className="size-4" strokeWidth={1.5} aria-hidden />}
                    Ganti
                  </Button>
                </div>
              ) : (
                <Button variant="outline" type="button" disabled={uploading === "stempel"} className="gap-2 mt-2" onClick={() => document.getElementById("stempel-input")?.click()}>
                  {uploading === "stempel" ? <Loader2 className="animate-spin" aria-hidden /> : <Upload className="size-4" strokeWidth={1.5} aria-hidden />}
                  Upload Stempel
                </Button>
              )}
              <input id="stempel-input" type="file" accept="image/png" className="hidden" onChange={(e) => handleUpload("stempel", e)} />
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
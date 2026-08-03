"use client";

/* src/app/admin/surat/_components/kades-config-form.tsx
 * Konfigurasi Kepala Desa: nama, NIP, jabatan, upload TTE (PNG transparan →
 * bucket private surat-ttd, hanya diakses server saat render PDF).
 */
import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Save, Upload } from "lucide-react";

import {
  updateKadesConfigAction,
  uploadTteAction,
} from "@/app/admin/surat/_actions";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

const labelClass = "text-[15px] font-medium leading-snug";

export function KadesConfigForm({
  initial,
}: {
  initial: {
    nama_kades: string;
    nip_kades: string | null;
    jabatan: string | null;
    ttd_cap_url: string | null;
  } | null;
}) {
  const router = useRouter();
  const [namaKades, setNamaKades] = useState(initial?.nama_kades ?? "");
  const [nip, setNip] = useState(initial?.nip_kades ?? "");
  const [jabatan, setJabatan] = useState(initial?.jabatan ?? "Kepala Desa");
  const [ttdPath, setTtdPath] = useState<string | null>(initial?.ttd_cap_url ?? null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, start] = useTransition();
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError(null);
    const fd = new FormData();
    fd.append("file", file);
    start(async () => {
      const res = await uploadTteAction(fd);
      setUploading(false);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setTtdPath(res.path);
      toast.success("Tanda tangan berhasil diunggah.");
    });
    e.target.value = "";
  }

  function handleSave() {
    if (!namaKades.trim()) {
      setError("Nama Kepala Desa wajib diisi.");
      return;
    }
    setError(null);
    start(async () => {
      const res = await updateKadesConfigAction({
        namaKades,
        nipKades: nip || undefined,
        jabatan: jabatan || undefined,
        ttdCapUrl: ttdPath ?? undefined,
      });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      toast.success("Konfigurasi tersimpan.");
      router.refresh();
    });
  }

  return (
    <Card className="mx-auto w-full max-w-[640px]">
      <CardHeader>
        <CardTitle>Konfigurasi Kepala Desa</CardTitle>
        <CardDescription>
          Data ini dicetak pada setiap surat yang disetujui.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <FieldGroup>
          <Field>
            <FieldLabel htmlFor="nama" className={labelClass}>
              Nama Kepala Desa <span className="text-destructive">*</span>
            </FieldLabel>
            <Input id="nama" value={namaKades} onChange={(e) => setNamaKades(e.target.value)} />
          </Field>
          <div className="grid grid-cols-1 gap-5 @md/field-group:grid-cols-2">
            <Field>
              <FieldLabel htmlFor="nip" className={labelClass}>
                NIP
              </FieldLabel>
              <Input id="nip" value={nip} onChange={(e) => setNip(e.target.value)} placeholder="Opsional" />
            </Field>
            <Field>
              <FieldLabel htmlFor="jabatan" className={labelClass}>
                Jabatan
              </FieldLabel>
              <Input id="jabatan" value={jabatan} onChange={(e) => setJabatan(e.target.value)} />
            </Field>
          </div>

          <Field>
            <FieldLabel className={labelClass}>Tanda Tangan (TTE)</FieldLabel>
            <FieldDescription className="text-[13px] text-muted-foreground">
              PNG transparan. Disimpan di bucket private — tidak pernah tampil
              sebagai URL publik.
            </FieldDescription>
            <div className="mt-2 flex flex-wrap items-center gap-3">
              <Button variant="outline" className="gap-2" onClick={() => fileRef.current?.click()} disabled={uploading}>
                {uploading ? <Loader2 className="animate-spin" aria-hidden /> : <Upload className="size-4" strokeWidth={1.5} aria-hidden />}
                {ttdPath ? "Ganti Tanda Tangan" : "Unggah Tanda Tangan"}
              </Button>
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleUpload} />
              {ttdPath && (
                <span className="text-[13px] text-muted-foreground">
                  ✓ Terpasang ({ttdPath})
                </span>
              )}
            </div>
          </Field>

          {error && <FieldError errors={[{ message: error }]} />}

          <Button className="gap-2" onClick={handleSave} disabled={isPending}>
            {isPending ? <Loader2 className="animate-spin" aria-hidden /> : <Save className="size-4" strokeWidth={1.5} aria-hidden />}
            Simpan
          </Button>
        </FieldGroup>
      </CardContent>
    </Card>
  );
}

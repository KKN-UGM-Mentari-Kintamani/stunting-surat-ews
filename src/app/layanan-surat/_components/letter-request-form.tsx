"use client";

/* src/app/layanan-surat/_components/letter-request-form.tsx
 * Smart form (PRD Phase 2 §4.1): pilih jenis surat, form identitas diisi
 * otomatis dari profil warga, tapi BISA diedit (fitur keluarga — surat atas
 * nama anggota keluarga lain; profil default tidak berubah). Field khusus
 * jenis surat ditambahkan dinamis. Lalu menuju preview.
 */
import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useRouter } from "next/navigation";
import { Eye, Loader2, PencilLine } from "lucide-react";

import { submitPermohonanAction } from "@/app/layanan-surat/_actions";
import { buildSnapshot } from "@/lib/surat/snapshot";
import type { IsianSnapshot, WargaProfilData } from "@/lib/surat/types";
import { LetterDocument } from "@/components/surat/letter-document";
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
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

export interface JenisSurat {
  id: string;
  nama_surat: string;
  kode_klasifikasi: string;
}

const identitySchema = z.object({
  nik: z.string().regex(/^[0-9]{16}$/, "NIK harus 16 digit."),
  nama: z.string().min(3, "Nama minimal 3 karakter."),
  tempat_lahir: z.string().min(2, "Tempat lahir wajib."),
  tanggal_lahir: z.string().min(1, "Tanggal lahir wajib."),
  agama: z.string().min(2, "Agama wajib."),
  pekerjaan: z.string().min(2, "Pekerjaan wajib."),
  alamat: z.string().min(5, "Alamat wajib."),
});
type IdentityValues = z.infer<typeof identitySchema>;

const labelClass = "text-[15px] font-medium leading-snug";

interface Props {
  profil: WargaProfilData;
  jenisSuratList: JenisSurat[];
  onSubmitted: () => void;
}

export function LetterRequestForm({ profil, jenisSuratList, onSubmitted }: Props) {
  const router = useRouter();
  const [jenisId, setJenisId] = useState<string>("");
  const [khusus, setKhusus] = useState<Record<string, string>>({});
  const [isPending, start] = useTransition();
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewSnapshot, setPreviewSnapshot] = useState<IsianSnapshot | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isValid },
  } = useForm<IdentityValues>({
    resolver: zodResolver(identitySchema),
    mode: "onChange",
    defaultValues: {
      nik: profil.nik,
      nama: profil.nama,
      tempat_lahir: profil.tempat_lahir,
      tanggal_lahir: profil.tanggal_lahir,
      agama: profil.agama,
      pekerjaan: profil.pekerjaan,
      alamat: profil.alamat,
    },
  });

  const selected = jenisSuratList.find((j) => j.id === jenisId);

  // Field khusus per jenis (MVP: SKU membutuhkan "nama usaha").
  const khususFields =
    selected?.nama_surat.includes("Usaha") ? ["nama_usaha", "bidang_usaha"] : [];

  function onSubmit(values: IdentityValues) {
    const snapshot = buildSnapshot(profil, values, khusus);
    setPreviewSnapshot(snapshot);
    setPreviewOpen(true);
  }

  function confirmSubmit() {
    if (!previewSnapshot || !jenisId) return;
    start(async () => {
      const res = await submitPermohonanAction(jenisId, previewSnapshot);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success("Surat berhasil diajukan.");
      setPreviewOpen(false);
      onSubmitted();
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-6">
      <Card className="mx-auto w-full max-w-[800px]">
        <CardHeader>
          <CardTitle>Ajukan Surat</CardTitle>
          <CardDescription>
            Pilih jenis surat lalu periksa data identitas. Data dapat diedit jika
            surat untuk anggota keluarga lain (profil default tidak berubah).
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-5">
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="jenis" className={labelClass}>
                  Jenis Surat <span className="text-destructive">*</span>
                </FieldLabel>
                <Select value={jenisId} onValueChange={setJenisId}>
                  <SelectTrigger id="jenis" className="w-full">
                    <SelectValue placeholder="Pilih jenis surat" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      {jenisSuratList.map((j) => (
                        <SelectItem key={j.id} value={j.id}>
                          {j.nama_surat}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
                {!jenisId && (
                  <FieldDescription className="text-[13px] text-muted-foreground">
                    Pilih jenis surat untuk melanjutkan.
                  </FieldDescription>
                )}
              </Field>

              <div className="grid grid-cols-1 gap-5 @md/field-group:grid-cols-2">
                <Field data-invalid={!!errors.nik}>
                  <FieldLabel htmlFor="nik" className={labelClass}>
                    NIK <span className="text-destructive">*</span>
                  </FieldLabel>
                  <Input id="nik" inputMode="numeric" maxLength={16} aria-invalid={!!errors.nik} {...register("nik")} />
                  {errors.nik && <FieldError errors={[errors.nik]} />}
                </Field>
                <Field data-invalid={!!errors.nama}>
                  <FieldLabel htmlFor="nama" className={labelClass}>
                    Nama <span className="text-destructive">*</span>
                  </FieldLabel>
                  <Input id="nama" aria-invalid={!!errors.nama} {...register("nama")} />
                  {errors.nama && <FieldError errors={[errors.nama]} />}
                </Field>
              </div>

              <div className="grid grid-cols-1 gap-5 @md/field-group:grid-cols-2">
                <Field data-invalid={!!errors.tempat_lahir}>
                  <FieldLabel htmlFor="tempat_lahir" className={labelClass}>
                    Tempat Lahir <span className="text-destructive">*</span>
                  </FieldLabel>
                  <Input id="tempat_lahir" aria-invalid={!!errors.tempat_lahir} {...register("tempat_lahir")} />
                  {errors.tempat_lahir && <FieldError errors={[errors.tempat_lahir]} />}
                </Field>
                <Field data-invalid={!!errors.tanggal_lahir}>
                  <FieldLabel htmlFor="tanggal_lahir" className={labelClass}>
                    Tanggal Lahir <span className="text-destructive">*</span>
                  </FieldLabel>
                  <Input id="tanggal_lahir" type="date" max={new Date().toISOString().slice(0, 10)} aria-invalid={!!errors.tanggal_lahir} {...register("tanggal_lahir")} />
                  {errors.tanggal_lahir && <FieldError errors={[errors.tanggal_lahir]} />}
                </Field>
              </div>

              <div className="grid grid-cols-1 gap-5 @md/field-group:grid-cols-2">
                <Field data-invalid={!!errors.agama}>
                  <FieldLabel htmlFor="agama" className={labelClass}>
                    Agama <span className="text-destructive">*</span>
                  </FieldLabel>
                  <Input id="agama" aria-invalid={!!errors.agama} {...register("agama")} />
                  {errors.agama && <FieldError errors={[errors.agama]} />}
                </Field>
                <Field data-invalid={!!errors.pekerjaan}>
                  <FieldLabel htmlFor="pekerjaan" className={labelClass}>
                    Pekerjaan <span className="text-destructive">*</span>
                  </FieldLabel>
                  <Input id="pekerjaan" aria-invalid={!!errors.pekerjaan} {...register("pekerjaan")} />
                  {errors.pekerjaan && <FieldError errors={[errors.pekerjaan]} />}
                </Field>
              </div>

              <Field data-invalid={!!errors.alamat}>
                <FieldLabel htmlFor="alamat" className={labelClass}>
                  Alamat Lengkap <span className="text-destructive">*</span>
                </FieldLabel>
                <Input id="alamat" aria-invalid={!!errors.alamat} {...register("alamat")} />
                {errors.alamat && <FieldError errors={[errors.alamat]} />}
              </Field>

              {khususFields.length > 0 && (
                <>
                  {khususFields.map((f) => (
                    <Field key={f}>
                      <FieldLabel htmlFor={`khusus-${f}`} className={labelClass}>
                        {f === "nama_usaha" ? "Nama Usaha" : f === "bidang_usaha" ? "Bidang Usaha" : f}{" "}
                        <span className="text-destructive">*</span>
                      </FieldLabel>
                      <Input
                        id={`khusus-${f}`}
                        aria-required
                        onChange={(e) => setKhusus((prev) => ({ ...prev, [f]: e.target.value }))}
                      />
                    </Field>
                  ))}
                  <FieldDescription className="text-[13px] text-muted-foreground">
                    Data usaha ini akan tercantum pada surat.
                  </FieldDescription>
                </>
              )}
            </FieldGroup>

            <Button type="submit" variant="default" className="gap-2" disabled={!isValid || !jenisId}>
              <Eye className="size-4" strokeWidth={1.5} aria-hidden />
              Lihat Pratinjau
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Preview modal */}
      {previewOpen && previewSnapshot && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4" onClick={() => setPreviewOpen(false)}>
          <div className="my-8 w-full max-w-[700px]" onClick={(e) => e.stopPropagation()}>
            <div className="mb-3 flex items-center justify-between">
              <h3 className="font-display text-[20px] font-medium text-white">
                Pratinjau Surat
              </h3>
              <Button variant="ghost" className="text-white" onClick={() => setPreviewOpen(false)}>
                Tutup
              </Button>
            </div>
            <LetterDocument snapshot={previewSnapshot} />
            <div className="mt-4 flex flex-wrap items-center justify-end gap-3">
              <Button
                variant="outline"
                className="gap-2 bg-white"
                onClick={() => setPreviewOpen(false)}
                disabled={isPending}
              >
                <PencilLine className="size-4" strokeWidth={1.5} aria-hidden />
                Kembali Edit
              </Button>
              <Button variant="default" className="gap-2" onClick={confirmSubmit} disabled={isPending}>
                {isPending && <Loader2 className="animate-spin" aria-hidden />}
                Ajukan Surat
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

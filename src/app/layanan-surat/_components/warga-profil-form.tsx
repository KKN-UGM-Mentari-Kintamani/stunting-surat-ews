"use client";

/* src/app/layanan-surat/_components/warga-profil-form.tsx
 * Progressive profiling (PRD §4.1): first visit requires NIK/KK/alamat.
 * Uses RHF + zod, calls saveWargaProfilAction on submit.
 */
import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, UserRound } from "lucide-react";

import { saveWargaProfilAction } from "@/app/layanan-surat/_actions";
import type { WargaProfilData } from "@/lib/surat/types";
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
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RequiredMark } from "@/components/ui/required-mark";
import { Alert, AlertDescription } from "@/components/ui/alert";

const agamaOptions = [
  "Islam", "Kristen", "Katolik", "Hindu", "Buddha", "Konghucu",
];

const statusOptions = ["Belum Kawin", "Kawin", "Cerai Hidup", "Cerai Mati"];

const profilSchema = z.object({
  nik: z.string().regex(/^[0-9]{16}$/, "NIK harus 16 digit angka."),
  no_kk: z.string().regex(/^[0-9]{16}$/, "No. KK harus 16 digit angka."),
  nama: z.string().min(2, "Nama minimal 2 karakter."),
  tempat_lahir: z.string().min(2, "Tempat lahir wajib."),
  tanggal_lahir: z.string().min(1, "Tanggal lahir wajib."),
  jenis_kelamin: z.enum(["L", "P"], "Jenis kelamin wajib."),
  status: z.string(),
  kewarganegaraan: z.string().min(1, "Kewarganegaraan wajib."),
  agama: z.string().min(1, "Agama wajib."),
  pekerjaan: z.string().min(2, "Pekerjaan wajib."),
  alamat: z.string().min(5, "Alamat wajib."),
});
type ProfilForm = z.infer<typeof profilSchema>;

const labelClass = "text-[15px] font-medium leading-snug";

interface Props {
  /** Prefill values — set when editing an existing profile. */
  initial?: WargaProfilData;
  onSaved: (profil: WargaProfilData) => void;
}

export function WargaProfilForm({ initial, onSaved }: Props) {
  const [error, setError] = useState<string | null>(null);
  const [isPending, start] = useTransition();
  const isEdit = !!initial;

  const { register, handleSubmit, setValue, watch, formState: { errors, isValid } } = useForm<ProfilForm>({
    resolver: zodResolver(profilSchema),
    mode: "onChange",
    defaultValues: {
      nik: initial?.nik ?? "",
      no_kk: initial?.no_kk ?? "",
      nama: initial?.nama ?? "",
      tempat_lahir: initial?.tempat_lahir ?? "",
      tanggal_lahir: initial?.tanggal_lahir ?? "",
      jenis_kelamin: initial?.jenis_kelamin ?? "L",
      status: initial?.status ?? "",
      kewarganegaraan: initial?.kewarganegaraan ?? "WNI",
      agama: initial?.agama ?? "",
      pekerjaan: initial?.pekerjaan ?? "",
      alamat: initial?.alamat ?? "",
    },
  });

  const agama = watch("agama");
  const jenisKelamin = watch("jenis_kelamin");
  const status = watch("status");

  function onSubmit(values: ProfilForm) {
    setError(null);
    start(async () => {
      const res = await saveWargaProfilAction(values);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      onSaved(values);
    });
  }

  return (
    <Card className="max-w-2xl">
      <CardHeader>
        <div className="flex items-center gap-3">
          <UserRound className="size-6 text-primary" strokeWidth={1.5} aria-hidden />
          <CardTitle>{isEdit ? "Ubah Data Warga" : "Lengkapi Profil Anda"}</CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        {isEdit ? (
          <p className="mb-4 text-[15px] leading-relaxed text-muted-foreground">
            Perubahan berlaku untuk pengajuan surat berikutnya dan tidak mengubah
            surat yang sudah diterbitkan.
          </p>
        ) : (
          <p className="mb-4 text-[15px] leading-relaxed text-muted-foreground">
            Untuk mengajukan surat, lengkapi data identitas (NIK, Kartu Keluarga,
            dan alamat). Data ini akan digunakan untuk mengisi formulir surat
            secara otomatis.
          </p>
        )}
        <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-5">
          <FieldGroup>
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <Field data-invalid={!!errors.nik}>
                <FieldLabel htmlFor="nik" className={labelClass}>NIK <RequiredMark /></FieldLabel>
                <Input id="nik" placeholder="16 digit" maxLength={16} inputMode="numeric"
                  aria-invalid={!!errors.nik} {...register("nik")} />
                {errors.nik && <FieldError errors={[errors.nik]} />}
              </Field>
              <Field data-invalid={!!errors.no_kk}>
                <FieldLabel htmlFor="no_kk" className={labelClass}>No. Kartu Keluarga <RequiredMark /></FieldLabel>
                <Input id="no_kk" placeholder="16 digit" maxLength={16} inputMode="numeric"
                  aria-invalid={!!errors.no_kk} {...register("no_kk")} />
                {errors.no_kk && <FieldError errors={[errors.no_kk]} />}
              </Field>
            </div>

            <Field data-invalid={!!errors.nama}>
              <FieldLabel htmlFor="nama" className={labelClass}>Nama Lengkap <RequiredMark /></FieldLabel>
              <Input id="nama" placeholder="Sesuai KTP"
                aria-invalid={!!errors.nama} {...register("nama")} />
              {errors.nama && <FieldError errors={[errors.nama]} />}
              <FieldDescription className="text-[13px] text-muted-foreground">
                Anda dapat mengubah nama di form surat untuk atas nama anggota keluarga.
              </FieldDescription>
            </Field>

            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <Field data-invalid={!!errors.tempat_lahir}>
                <FieldLabel htmlFor="tempat_lahir" className={labelClass}>Tempat Lahir <RequiredMark /></FieldLabel>
                <Input id="tempat_lahir" placeholder="Contoh: Denpasar"
                  aria-invalid={!!errors.tempat_lahir} {...register("tempat_lahir")} />
                {errors.tempat_lahir && <FieldError errors={[errors.tempat_lahir]} />}
              </Field>
              <Field data-invalid={!!errors.tanggal_lahir}>
                <FieldLabel htmlFor="tanggal_lahir" className={labelClass}>Tanggal Lahir <RequiredMark /></FieldLabel>
                <Input id="tanggal_lahir" type="date"
                  max={new Date().toISOString().slice(0, 10)}
                  aria-invalid={!!errors.tanggal_lahir} {...register("tanggal_lahir")} />
                {errors.tanggal_lahir && <FieldError errors={[errors.tanggal_lahir]} />}
              </Field>
            </div>

            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <Field>
                <FieldLabel htmlFor="jenis_kelamin" className={labelClass}>Jenis Kelamin <RequiredMark /></FieldLabel>
                <Select value={jenisKelamin} onValueChange={(v) => setValue("jenis_kelamin", v as "L" | "P", { shouldValidate: true })}>
                  <SelectTrigger id="jenis_kelamin" className="w-full">
                    <SelectValue placeholder="Pilih jenis kelamin" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      <SelectItem value="L">Laki-laki</SelectItem>
                      <SelectItem value="P">Perempuan</SelectItem>
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </Field>
              <Field>
                <FieldLabel htmlFor="status" className={labelClass}>Status Perkawinan</FieldLabel>
                <Select value={status} onValueChange={(v) => setValue("status", v, { shouldValidate: true })}>
                  <SelectTrigger id="status" className="w-full">
                    <SelectValue placeholder="Pilih status (opsional)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      {statusOptions.map((s) => (
                        <SelectItem key={s} value={s}>{s}</SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </Field>
            </div>

            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <Field data-invalid={!!errors.kewarganegaraan}>
                <FieldLabel htmlFor="kewarganegaraan" className={labelClass}>Kewarganegaraan <RequiredMark /></FieldLabel>
                <Input id="kewarganegaraan" placeholder="Contoh: WNI"
                  aria-invalid={!!errors.kewarganegaraan} {...register("kewarganegaraan")} />
                {errors.kewarganegaraan && <FieldError errors={[errors.kewarganegaraan]} />}
              </Field>
            </div>

            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <Field>
                <FieldLabel htmlFor="agama" className={labelClass}>Agama <RequiredMark /></FieldLabel>
                <Select value={agama} onValueChange={(v) => setValue("agama", v, { shouldValidate: true })}>
                  <SelectTrigger id="agama" aria-invalid={!agama} className="w-full">
                    <SelectValue placeholder="Pilih agama" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      {agamaOptions.map((a) => (
                        <SelectItem key={a} value={a}>{a}</SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </Field>
              <Field data-invalid={!!errors.pekerjaan}>
                <FieldLabel htmlFor="pekerjaan" className={labelClass}>Pekerjaan <RequiredMark /></FieldLabel>
                <Input id="pekerjaan" placeholder="Contoh: Petani"
                  aria-invalid={!!errors.pekerjaan} {...register("pekerjaan")} />
                {errors.pekerjaan && <FieldError errors={[errors.pekerjaan]} />}
              </Field>
            </div>

            <Field data-invalid={!!errors.alamat}>
              <FieldLabel htmlFor="alamat" className={labelClass}>Alamat Lengkap <RequiredMark /></FieldLabel>
              <Input id="alamat" placeholder="Jl., RT/RW, Dusun, Desa, Kecamatan"
                aria-invalid={!!errors.alamat} {...register("alamat")} />
              {errors.alamat && <FieldError errors={[errors.alamat]} />}
            </Field>
          </FieldGroup>

          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <Button type="submit" disabled={!isValid || !agama || isPending} className="gap-2">
            {isPending && <Loader2 className="animate-spin" aria-hidden />}
            {isEdit ? "Simpan Perubahan" : "Simpan Profil"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
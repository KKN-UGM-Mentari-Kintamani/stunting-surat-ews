"use client";

/* src/app/layanan-surat/_components/warga-profil-form.tsx
 * Progressive profiling (PRD §4.1 / Phase 2 PRD §4.1): NIK/KK form shown on
 * first entry to the letter service. Consent for NIK/KK enforced by RLS.
 */
import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

import { saveWargaProfilAction } from "@/app/layanan-surat/_actions";
import type { WargaProfilData } from "@/lib/surat/types";
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
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

const schema = z.object({
  nik: z.string().regex(/^[0-9]{16}$/, "NIK harus 16 digit angka."),
  no_kk: z
    .string()
    .refine((v) => v === "" || /^[0-9]{16}$/.test(v), "No. KK harus 16 digit angka.")
    .optional(),
  nama: z.string().min(3, "Nama minimal 3 karakter."),
  tempat_lahir: z.string().min(2, "Tempat lahir wajib diisi."),
  tanggal_lahir: z.string().min(1, "Tanggal lahir wajib diisi."),
  agama: z.string().min(2, "Agama wajib diisi."),
  pekerjaan: z.string().min(2, "Pekerjaan wajib diisi."),
  alamat: z.string().min(5, "Alamat wajib diisi."),
});
type FormValues = z.infer<typeof schema>;

const labelClass = "text-[15px] font-medium leading-snug";

export function WargaProfilForm({ onSaved }: { onSaved: () => void }) {
  const router = useRouter();
  const [isPending, start] = useTransition();
  const {
    register,
    handleSubmit,
    formState: { errors, isValid },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    mode: "onChange",
    defaultValues: {
      nik: "",
      no_kk: "",
      nama: "",
      tempat_lahir: "",
      tanggal_lahir: "",
      agama: "",
      pekerjaan: "",
      alamat: "",
    },
  });

  function onSubmit(values: FormValues) {
    const data: WargaProfilData = {
      nik: values.nik,
      no_kk: values.no_kk || undefined,
      nama: values.nama,
      tempat_lahir: values.tempat_lahir,
      tanggal_lahir: values.tanggal_lahir,
      agama: values.agama,
      pekerjaan: values.pekerjaan,
      alamat: values.alamat,
    };
    start(async () => {
      const res = await saveWargaProfilAction(data);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success("Profil tersimpan.");
      onSaved();
      router.refresh();
    });
  }

  return (
    <Card className="mx-auto w-full max-w-[800px]">
      <CardHeader>
        <CardTitle>Lengkapi Data Diri</CardTitle>
        <CardDescription>
          Data NIK &amp; KK diperlukan untuk layanan surat desa. Data hanya
          dipakai untuk administrasi dan tidak dibagikan ke pihak lain.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-5">
          <FieldGroup>
            <div className="grid grid-cols-1 gap-5 @md/field-group:grid-cols-2">
              <Field data-invalid={!!errors.nik}>
                <FieldLabel htmlFor="nik" className={labelClass}>
                  NIK <span className="text-destructive">*</span>
                </FieldLabel>
                <Input id="nik" inputMode="numeric" maxLength={16} placeholder="16 digit" aria-invalid={!!errors.nik} {...register("nik")} />
                {errors.nik && <FieldError errors={[errors.nik]} />}
              </Field>
              <Field data-invalid={!!errors.no_kk}>
                <FieldLabel htmlFor="no_kk" className={labelClass}>
                  No. KK
                </FieldLabel>
                <Input id="no_kk" inputMode="numeric" maxLength={16} placeholder="16 digit (opsional)" aria-invalid={!!errors.no_kk} {...register("no_kk")} />
                {errors.no_kk && <FieldError errors={[errors.no_kk]} />}
              </Field>
            </div>

            <Field data-invalid={!!errors.nama}>
              <FieldLabel htmlFor="nama" className={labelClass}>
                Nama Lengkap <span className="text-destructive">*</span>
              </FieldLabel>
              <Input id="nama" aria-invalid={!!errors.nama} {...register("nama")} />
              {errors.nama && <FieldError errors={[errors.nama]} />}
            </Field>

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
          </FieldGroup>

          <Button type="submit" disabled={!isValid || isPending}>
            {isPending && <Loader2 className="animate-spin" aria-hidden />}
            Simpan Profil
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

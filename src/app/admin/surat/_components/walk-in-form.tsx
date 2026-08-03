"use client";

/* src/app/admin/surat/_components/walk-in-form.tsx
 * Walk-in service (PRD §4.2): admin creates a letter for a citizen without an
 * account — types KTP data manually. user_id = NULL, admin_pembuat_id = admin.
 */
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, Save } from "lucide-react";

import { createWalkInAction } from "@/app/admin/surat/_actions";
import { buildSnapshot } from "@/lib/surat/snapshot";
import type { JenisSurat } from "@/app/layanan-surat/_components/letter-request-form";
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
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

const schema = z.object({
  nik: z.string().regex(/^[0-9]{16}$/, "NIK harus 16 digit."),
  nama: z.string().min(3, "Nama minimal 3 karakter."),
  tempat_lahir: z.string().min(2, "Tempat lahir wajib."),
  tanggal_lahir: z.string().min(1, "Tanggal lahir wajib."),
  agama: z.string().min(2, "Agama wajib."),
  pekerjaan: z.string().min(2, "Pekerjaan wajib."),
  alamat: z.string().min(5, "Alamat wajib."),
});
type FormValues = z.infer<typeof schema>;

const labelClass = "text-[15px] font-medium leading-snug";

export function WalkInForm({ jenisSuratList }: { jenisSuratList: JenisSurat[] }) {
  const router = useRouter();
  const [jenisId, setJenisId] = useState("");
  const [khusus, setKhusus] = useState<Record<string, string>>({});
  const [isPending, start] = useTransition();
  const {
    register,
    handleSubmit,
    formState: { errors, isValid },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    mode: "onChange",
  });

  const selected = jenisSuratList.find((j) => j.id === jenisId);
  const khususFields = selected?.nama_surat.includes("Usaha")
    ? ["nama_usaha", "bidang_usaha"]
    : [];

  function onSubmit(values: FormValues) {
    const snapshot = buildSnapshot(
      {
        nik: values.nik,
        nama: values.nama,
        tempat_lahir: values.tempat_lahir,
        tanggal_lahir: values.tanggal_lahir,
        agama: values.agama,
        pekerjaan: values.pekerjaan,
        alamat: values.alamat,
      },
      {},
      khusus,
    );
    start(async () => {
      const res = await createWalkInAction(jenisId, snapshot);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success("Surat walk-in masuk antrian persetujuan.");
      router.push("/admin/surat");
    });
  }

  return (
    <Card className="mx-auto w-full max-w-[800px]">
      <CardHeader>
        <CardTitle>Buat Surat Walk-In</CardTitle>
        <CardDescription>
          Melayani warga yang datang langsung tanpa akun. Ketik data KTP warga
          secara manual; permohonan masuk antrian yang sama dengan online.
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
                      <SelectItem key={j.id} value={j.id}>{j.nama_surat}</SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
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
          </FieldGroup>

          <Button type="submit" className="gap-2" disabled={!isValid || !jenisId || isPending}>
            {isPending ? <Loader2 className="animate-spin" aria-hidden /> : <Save className="size-4" strokeWidth={1.5} aria-hidden />}
            Masukkan ke Antrian
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

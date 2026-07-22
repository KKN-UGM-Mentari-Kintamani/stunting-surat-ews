"use client";

/* src/app/profil/_components/measurement-dialog.tsx
 * Form pencatatan pengukuran: tanggal ukur, berat, tinggi, plus dua skrining
 * kader opsional. Umur anak TIDAK diinput — dihitung server dari tanggal_lahir
 * (single source of truth medis), sehingga tak bisa selisih(field vs tanggal_lahir).
 * Reused both from a child card (childId passed) and from the Home save-flow
 * (childId chosen by the caller before opening).
 */
import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";

import { saveMeasurementAction } from "@/app/profil/_actions";
import {
  measurementSchema,
  type MeasurementValues,
} from "@/lib/calc/profile-schema";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";

interface Props {
  childId: string;
  childName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const labelClass = "text-[15px] font-medium leading-snug";

export function MeasurementDialog({
  childId,
  childName,
  open,
  onOpenChange,
}: Props) {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isValid },
  } = useForm<MeasurementValues>({
    resolver: zodResolver(measurementSchema),
    mode: "onChange",
    defaultValues: {
      anakId: childId,
      tanggalUkur: new Date().toISOString().slice(0, 10),
      beratBadanKg: NaN,
      tinggiBadanCm: NaN,
      lingkarKepalaCm: undefined,
      lingkarLenganCm: undefined,
    },
  });

  function onSubmit(values: MeasurementValues) {
    setError(null);
    startTransition(async () => {
      const res = await saveMeasurementAction(values);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      reset();
      onOpenChange(false);
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Catat Pengukuran untuk {childName}</DialogTitle>
          <DialogDescription>
            Umur anak akan dihitung otomatis dari tanggal lahir pada saat
            disimpan.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} noValidate>
          <input type="hidden" {...register("anakId")} value={childId} />
          <FieldGroup>
            <Field data-invalid={!!errors.tanggalUkur}>
              <FieldLabel htmlFor="tgl" className={labelClass}>
                Tanggal Ukur <span aria-hidden className="text-destructive">*</span>
              </FieldLabel>
              <Input
                id="tgl"
                type="date"
                max={new Date().toISOString().slice(0, 10)}
                aria-invalid={!!errors.tanggalUkur}
                {...register("tanggalUkur")}
              />
              {errors.tanggalUkur && (
                <FieldError errors={[errors.tanggalUkur]} />
              )}
            </Field>

            <div className="grid grid-cols-1 gap-5 @md/field-group:grid-cols-2">
              <Field data-invalid={!!errors.beratBadanKg}>
                <FieldLabel htmlFor="berat" className={labelClass}>
                  Berat badan (kg) <span aria-hidden className="text-destructive">*</span>
                </FieldLabel>
                <Input
                  id="berat"
                  type="number"
                  inputMode="decimal"
                  step={0.1}
                  min={1}
                  max={45}
                  placeholder="Contoh: 9.5"
                  aria-invalid={!!errors.beratBadanKg}
                  {...register("beratBadanKg", { valueAsNumber: true })}
                />
                {errors.beratBadanKg && (
                  <FieldError errors={[errors.beratBadanKg]} />
                )}
              </Field>

              <Field data-invalid={!!errors.tinggiBadanCm}>
                <FieldLabel htmlFor="tinggi" className={labelClass}>
                  Tinggi/panjang badan (cm){" "}
                  <span aria-hidden className="text-destructive">*</span>
                </FieldLabel>
                <Input
                  id="tinggi"
                  type="number"
                  inputMode="decimal"
                  step={0.1}
                  min={35}
                  max={130}
                  placeholder="Contoh: 74"
                  aria-invalid={!!errors.tinggiBadanCm}
                  {...register("tinggiBadanCm", { valueAsNumber: true })}
                />
                {errors.tinggiBadanCm && (
                  <FieldError errors={[errors.tinggiBadanCm]} />
                )}
              </Field>

              <Field data-invalid={!!errors.lingkarKepalaCm}>
                <FieldLabel htmlFor="lk" className={labelClass}>
                  Lingkar kepala (cm)
                  <span className="ml-1 text-[13px] font-normal text-muted-foreground">
                    (opsional)
                  </span>
                </FieldLabel>
                <Input
                  id="lk"
                  type="number"
                  inputMode="decimal"
                  step={0.1}
                  min={20}
                  max={60}
                  placeholder="Contoh: 46"
                  aria-invalid={!!errors.lingkarKepalaCm}
                  {...register("lingkarKepalaCm", {
                    setValueAs: (v) =>
                      v === "" || v === null || Number.isNaN(v)
                        ? undefined
                        : Number(v),
                  })}
                />
                {errors.lingkarKepalaCm && (
                  <FieldError errors={[errors.lingkarKepalaCm]} />
                )}
              </Field>

              <Field data-invalid={!!errors.lingkarLenganCm}>
                <FieldLabel htmlFor="ll" className={labelClass}>
                  Lingkar lengan atas (cm)
                  <span className="ml-1 text-[13px] font-normal text-muted-foreground">
                    (opsional)
                  </span>
                </FieldLabel>
                <Input
                  id="ll"
                  type="number"
                  inputMode="decimal"
                  step={0.1}
                  min={5}
                  max={30}
                  placeholder="Contoh: 15"
                  aria-invalid={!!errors.lingkarLenganCm}
                  {...register("lingkarLenganCm", {
                    setValueAs: (v) =>
                      v === "" || v === null || Number.isNaN(v)
                        ? undefined
                        : Number(v),
                  })}
                />
                {errors.lingkarLenganCm && (
                  <FieldError errors={[errors.lingkarLenganCm]} />
                )}
              </Field>
            </div>

            {error && (
              <FieldDescription className="font-normal text-destructive">
                {error}
              </FieldDescription>
            )}
          </FieldGroup>

          <DialogFooter className="mt-6">
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
              disabled={isPending}
            >
              Batal
            </Button>
            <Button type="submit" disabled={!isValid || isPending}>
              {isPending && <Loader2 className="animate-spin" aria-hidden />}
              Simpan Pengukuran
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
"use client";

/* src/components/calculator/calculator-form.tsx
 * Input form (PRD §4.2A). Strict client-side validation: age 0–60 is the hard
 * boundary of the WHO LMS reference table — outside it the submit button
 * disables and shows the exact PRD-mandated message. The math runs purely
 * client-side (PRD §5.3), no network round-trip on submit.
 *
 * Layout: 6 inputs in a responsive 2-column grid (3 left / 3 right). Required
 * fields carry a red asterisk; the two optional kader screenings have none.
 */
import { useEffect, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Info, Loader2 } from "lucide-react";

import {
  calculatorSchema,
  type CalculatorFormValues,
} from "@/lib/calc/schema";
import { MAX_AGE_MONTHS, MIN_AGE_MONTHS } from "@/lib/calc/lms";
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
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Props {
  onSubmit: (values: CalculatorFormValues) => void;
  isCalculating?: boolean;
}

const fieldLabelClass = "text-[15px] font-medium leading-snug";
const helperClass = "text-[13px] leading-relaxed text-muted-foreground";
const gridClass =
  "grid grid-cols-1 gap-5 @md/field-group:grid-cols-2";

function RequiredMark() {
  return (
    <span aria-hidden className="ml-0.5 text-destructive">
      *
    </span>
  );
}

export function CalculatorForm({ onSubmit, isCalculating = false }: Props) {
  const [draftRestored, setDraftRestored] = useState(false);
  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors, isValid },
  } = useForm<CalculatorFormValues>({
    resolver: zodResolver(calculatorSchema),
    mode: "onChange",
    defaultValues: {
      gender: undefined,
      ageMonths: NaN,
      weightKg: NaN,
      heightCm: NaN,
      headCircumferenceCm: undefined,
      armCircumferenceCm: undefined,
    },
  });

  // Draft restore (PDP-safe: non-persistent sessionStorage only). After login
  // on the Guest save-flow, "Simpan ke Riwayat" wrote the form values here; on
  // home return we re-populate the form so the user can re-check immediately.
  useEffect(() => {
    if (draftRestored) return;
    try {
      const raw = sessionStorage.getItem("stunting_draft");
      if (!raw) return;
      sessionStorage.removeItem("stunting_draft");
      const d = JSON.parse(raw) as CalculatorFormValues & { ts: number };
      if (!d || typeof d.ts !== "number") return;
      // Drafts expire after 30 min — long enough for a Google OAuth roundtrip.
      if (Date.now() - d.ts > 30 * 60 * 1000) return;
      reset({
        gender: d.gender,
        ageMonths: Number.isFinite(d.ageMonths) ? d.ageMonths : NaN,
        weightKg: Number.isFinite(d.weightKg) ? d.weightKg : NaN,
        heightCm: Number.isFinite(d.heightCm) ? d.heightCm : NaN,
        headCircumferenceCm: Number.isFinite(d.headCircumferenceCm)
          ? d.headCircumferenceCm
          : undefined,
        armCircumferenceCm: Number.isFinite(d.armCircumferenceCm)
          ? d.armCircumferenceCm
          : undefined,
      });
    } catch {
      // ignore — sessionStorage may be blocked in private mode.
    } finally {
      setDraftRestored(true);
    }
  }, [draftRestored, reset]);

  const ageOutOfRange =
    errors.ageMonths?.message &&
    errors.ageMonths.message.includes("0–60 bulan");

  return (
    <Card className="mx-auto w-full max-w-[1120px]">
      <CardHeader>
        <CardTitle>Isi Data Pengukuran</CardTitle>
      </CardHeader>
      <CardContent>
        <form
          onSubmit={handleSubmit((v) => onSubmit(v))}
          noValidate
          className="flex flex-col gap-5"
        >
          <FieldGroup>

            {/* Row 1: Gender | Weight (collapses to a single column on narrow cards). */}
            <div className={gridClass}>
              <Field data-invalid={!!errors.gender}>
                <FieldLabel htmlFor="gender" className={fieldLabelClass}>
                  Jenis Kelamin<RequiredMark />
                </FieldLabel>
                <Controller
                  name="gender"
                  control={control}
                  render={({ field }) => (
                    <Select
                      value={field.value}
                      onValueChange={field.onChange}
                    >
                      <SelectTrigger
                        id="gender"
                        aria-invalid={!!errors.gender}
                        className="w-full"
                      >
                        <SelectValue placeholder="Pilih jenis kelamin" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectGroup>
                          <SelectItem value="male">Laki-laki</SelectItem>
                          <SelectItem value="female">Perempuan</SelectItem>
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                  )}
                />
                {errors.gender && (
                  <FieldError errors={[errors.gender]} />
                )}
              </Field>

              <Field data-invalid={!!errors.weightKg}>
                <FieldLabel htmlFor="weightKg" className={fieldLabelClass}>
                  Berat badan (kg)<RequiredMark />
                </FieldLabel>
                <Input
                  id="weightKg"
                  type="number"
                  inputMode="decimal"
                  step={0.1}
                  min={1}
                  max={45}
                  placeholder="Contoh: 9.5"
                  aria-invalid={!!errors.weightKg}
                  {...register("weightKg", { valueAsNumber: true })}
                />
                {errors.weightKg && (
                  <FieldError errors={[errors.weightKg]} />
                )}
              </Field>
            </div>

            {/* Row 2: Age | Height */}
            <div className={gridClass}>
              <Field data-invalid={!!errors.ageMonths}>
                <FieldLabel htmlFor="ageMonths" className={fieldLabelClass}>
                  Usia (bulan)<RequiredMark />
                </FieldLabel>
                <Input
                  id="ageMonths"
                  type="number"
                  inputMode="numeric"
                  min={0}
                  max={MAX_AGE_MONTHS}
                  step={1}
                  placeholder="Contoh: 14"
                  aria-invalid={!!errors.ageMonths}
                  {...register("ageMonths", { valueAsNumber: true })}
                />
                <FieldDescription className={helperClass}>
                  Berlaku untuk usia {MIN_AGE_MONTHS}–{MAX_AGE_MONTHS} bulan.
                </FieldDescription>
                {errors.ageMonths && (
                  <FieldError
                    errors={[errors.ageMonths]}
                    className="flex items-center gap-1.5"
                  >
                    {ageOutOfRange && (
                      <Info className="size-4 shrink-0" aria-hidden />
                    )}
                    {errors.ageMonths.message}
                  </FieldError>
                )}
              </Field>

              <Field data-invalid={!!errors.heightCm}>
                <FieldLabel htmlFor="heightCm" className={fieldLabelClass}>
                  Tinggi/panjang badan (cm)<RequiredMark />
                </FieldLabel>
                <Input
                  id="heightCm"
                  type="number"
                  inputMode="decimal"
                  step={0.1}
                  min={35}
                  max={130}
                  placeholder="Contoh: 74"
                  aria-invalid={!!errors.heightCm}
                  {...register("heightCm", { valueAsNumber: true })}
                />
                {errors.heightCm && (
                  <FieldError errors={[errors.heightCm]} />
                )}
              </Field>
            </div>

            {/* Row 3: Optional kader screenings (PRD 4.1) — always visible, no asterisk. */}
            <div className={gridClass}>
              <Field data-invalid={!!errors.headCircumferenceCm}>
                <FieldLabel
                  htmlFor="headCircumferenceCm"
                  className={fieldLabelClass}
                >
                  Lingkar kepala (cm)
                  <span className="ml-1 text-[13px] font-normal text-muted-foreground">
                    (opsional)
                  </span>
                </FieldLabel>
                <Input
                  id="headCircumferenceCm"
                  type="number"
                  inputMode="decimal"
                  step={0.1}
                  min={20}
                  max={60}
                  placeholder="Contoh: 46"
                  aria-invalid={!!errors.headCircumferenceCm}
                  {...register("headCircumferenceCm", {
                    setValueAs: (v) =>
                      v === "" || v === null || Number.isNaN(v)
                        ? undefined
                        : Number(v),
                  })}
                />
                {errors.headCircumferenceCm && (
                  <FieldError errors={[errors.headCircumferenceCm]} />
                )}
              </Field>

              <Field data-invalid={!!errors.armCircumferenceCm}>
                <FieldLabel
                  htmlFor="armCircumferenceCm"
                  className={fieldLabelClass}
                >
                  Lingkar lengan atas (cm)
                  <span className="ml-1 text-[13px] font-normal text-muted-foreground">
                    (opsional)
                  </span>
                </FieldLabel>
                <Input
                  id="armCircumferenceCm"
                  type="number"
                  inputMode="decimal"
                  step={0.1}
                  min={5}
                  max={30}
                  placeholder="Contoh: 15"
                  aria-invalid={!!errors.armCircumferenceCm}
                  {...register("armCircumferenceCm", {
                    setValueAs: (v) =>
                      v === "" || v === null || Number.isNaN(v)
                        ? undefined
                        : Number(v),
                  })}
                />
                {errors.armCircumferenceCm && (
                  <FieldError errors={[errors.armCircumferenceCm]} />
                )}
              </Field>
            </div>
          </FieldGroup>

          <div className="flex flex-col gap-2 @md/field-group:flex-row @md/field-group:items-center @md/field-group:justify-between">
            <Button type="submit" size="lg" disabled={!isValid || isCalculating}>
              {isCalculating ? (
                <Loader2 className="animate-spin" aria-hidden />
              ) : null}
              {isCalculating ? "Menghitung…" : "Cek Sekarang"}
            </Button>
            {!isValid && !isCalculating && (
              <p className="text-[13px] text-muted-foreground">
                Lengkapi data yang wajib diisi <span className="text-destructive">*</span> untuk melakukan perhitungan.
              </p>
            )}
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
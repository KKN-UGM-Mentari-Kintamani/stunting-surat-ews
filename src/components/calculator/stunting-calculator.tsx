"use client";

/* src/components/calculator/stunting-calculator.tsx
 * Orchestrates the home calculator. Pure client-side math (PRD §5.3): the
 * RHF + zod layer guarantees valid input, so computeAssessment is called
 * directly — no network, no spinner. Status verdict is snapshotted into state
 * so the ResultSection can stagger its reveal (Design §7).
 */
import { useRef, useState } from "react";
import { toast } from "sonner";

import { CalculatorForm } from "@/components/calculator/calculator-form";
import { ResultSection } from "@/components/calculator/result-section";
import type { SaveDraft } from "@/components/calculator/save-flow";
import {
  computeAssessment,
  type Assessment,
  type CalculatorInput,
  type Gender,
} from "@/lib/calc/lms";
import type { CalculatorFormValues } from "@/lib/calc/schema";
import type { ChildSummary } from "@/app/profil/_queries";

interface Props {
  isLoggedIn: boolean;
  anak: ChildSummary[];
}

interface Echo {
  ageMonths: number;
  gender: Gender;
  draft: SaveDraft;
}

export function StuntingCalculator({ isLoggedIn, anak }: Props) {
  const [assessment, setAssessment] = useState<Assessment | null>(null);
  const [echo, setEcho] = useState<Echo | null>(null);
  const resultRef = useRef<HTMLDivElement>(null);

  function handleSubmit(values: CalculatorFormValues) {
    const input: CalculatorInput = {
      gender: values.gender,
      ageMonths: values.ageMonths,
      weightKg: values.weightKg,
      heightCm: values.heightCm,
      headCircumferenceCm:
        typeof values.headCircumferenceCm === "number"
          ? values.headCircumferenceCm
          : undefined,
      armCircumferenceCm:
        typeof values.armCircumferenceCm === "number"
          ? values.armCircumferenceCm
          : undefined,
    };

    try {
      const result = computeAssessment(input);
      setAssessment(result);
      setEcho({
        ageMonths: values.ageMonths,
        gender: values.gender,
        draft: {
          gender: values.gender,
          ageMonths: values.ageMonths,
          beratBadanKg: values.weightKg,
          tinggiBadanCm: values.heightCm,
          lingkarKepalaCm:
            typeof values.headCircumferenceCm === "number"
              ? values.headCircumferenceCm
              : undefined,
          lingkarLenganCm:
            typeof values.armCircumferenceCm === "number"
              ? values.armCircumferenceCm
              : undefined,
        },
      });
      // Bring the verdict into view after the reveal mounts.
      requestAnimationFrame(() =>
        resultRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        }),
      );
    } catch (err) {
      // RHF + zod normally guarantee this branch is unreachable for age, so a
      // real failure here is a defensive backstop (AGENTS.md §2), never silent.
      console.error("[calculator] assessment failed:", err);
      toast.error("Maaf, perhitungan gagal. Periksa kembali isian Anda.");
    }
  }

  function handleReset() {
    setAssessment(null);
    setEcho(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  return (
    <div className="mx-auto flex w-full max-w-[1120px] flex-col gap-8 px-5 pb-12 md:px-8">
      <CalculatorForm onSubmit={handleSubmit} />

      {assessment && echo && (
        <div ref={resultRef} className="scroll-mt-24">
          <ResultSection
            assessment={assessment}
            ageMonths={echo.ageMonths}
            gender={echo.gender}
            isLoggedIn={isLoggedIn}
            anak={anak}
            draft={echo.draft}
            onReset={handleReset}
          />
        </div>
      )}
    </div>
  );
}
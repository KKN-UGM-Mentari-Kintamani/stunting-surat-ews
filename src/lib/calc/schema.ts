/* src/lib/calc/schema.ts
 * Zod schema for the stunting calculator form (PRD §4.2A input validation).
 * Shared contract: the client validates with it today; the server re-validates
 * with the same schema when "Save to Growth History" lands (never trust the
 * client — AGENTS.md defensive programming).
 */
import { z } from "zod";

import { MAX_AGE_MONTHS, MIN_AGE_MONTHS } from "@/lib/calc/lms";

/** Exact message mandated by PRD §4.2A for out-of-range ages. */
export const AGE_RANGE_MESSAGE =
  "Kalkulator ini berlaku untuk anak usia 0–60 bulan (5 tahun). Untuk anak di luar rentang tersebut, silakan konsultasi langsung ke Posyandu/Puskesmas.";

/*
 * Plausibility bounds follow WHO plausible thresholds for 0–60 month olds
 * (PRD §4.2A: proactive validation, not arbitrary numbers) — they reject
 * accidents like a 500 cm height without blocking real edge cases.
 */
export const calculatorSchema = z.object({
  gender: z.enum(["male", "female"], {
    message: "Pilih jenis kelamin anak.",
  }),
  ageMonths: z
    .number({ message: "Masukkan usia dalam bulan." })
    .int("Usia harus berupa bulan penuh (contoh: 14).")
    .min(MIN_AGE_MONTHS, AGE_RANGE_MESSAGE)
    .max(MAX_AGE_MONTHS, AGE_RANGE_MESSAGE),
  weightKg: z
    .number({ message: "Masukkan berat badan." })
    .min(1, "Berat minimal 1 kg — periksa kembali angkanya.")
    .max(45, "Berat di luar rentang wajar balita (maks. 45 kg)."),
  heightCm: z
    .number({ message: "Masukkan tinggi/panjang badan." })
    .min(35, "Panjang minimal 35 cm — periksa kembali angkanya.")
    .max(130, "Tinggi di luar rentang wajar balita (maks. 130 cm)."),
  // Optional kader screenings (PRD 4.1) — validated only when filled.
  headCircumferenceCm: z
    .number({ message: "Masukkan lingkar kepala." })
    .min(20, "Lingkar kepala minimal 20 cm.")
    .max(60, "Lingkar kepala maksimal 60 cm.")
    .optional(),
  armCircumferenceCm: z
    .number({ message: "Masukkan lingkar lengan atas." })
    .min(5, "Lingkar lengan minimal 5 cm.")
    .max(30, "Lingkar lengan maksimal 30 cm.")
    .optional(),
});

export type CalculatorFormValues = z.infer<typeof calculatorSchema>;

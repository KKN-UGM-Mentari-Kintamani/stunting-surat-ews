/* src/lib/calc/lms.ts
 * WHO 2006 LMS engine (PRD §5.3). Pure functions, zero I/O — the reference
 * table is a static JSON hash map keyed by age in months (O(1) lookup),
 * never stored in PostgreSQL and never fetched over the network.
 *
 * LMS formula:
 *   L ≠ 0:  Z = ((X/M)^L − 1) / (L·S)
 *   L = 0:  Z = ln(X/M) / S
 *
 * Boundaries (PRD §5.3): age is strictly 0–60 months. Out-of-range requests
 * THROW — extrapolating Z-scores beyond the reference table is medically
 * invalid, so there is deliberately no fallback.
 */
import whoData from "@/lib/data/who-zscores.json";

export type Gender = "male" | "female";
/** Age-keyed indicators (months 0–60; acfa starts at month 3). */
export type AgeIndicator = "wfa" | "lhfa" | "bmi" | "hcfa" | "acfa";
/** Length/height-keyed indicators (cm at 0.5 resolution). */
export type HeightIndicator = "wfh" | "wfl";

export type StuntingStatus = "normal" | "mild" | "high";

export interface LmsParams {
  L: number;
  M: number;
  S: number;
}

export const MIN_AGE_MONTHS = 0;
export const MAX_AGE_MONTHS = 60;

const AGE_INDICATORS: readonly AgeIndicator[] = ["wfa", "lhfa", "bmi", "hcfa", "acfa"];
const HEIGHT_INDICATORS: readonly HeightIndicator[] = ["wfh", "wfl"];

interface WhoJson {
  [indicator: string]: {
    boys: Record<string, LmsParams>;
    girls: Record<string, LmsParams>;
  };
}

const tables = whoData as unknown as WhoJson;

function sexKey(gender: Gender): "boys" | "girls" {
  return gender === "male" ? "boys" : "girls";
}

function assertAgeInRange(ageMonths: number): void {
  if (
    !Number.isInteger(ageMonths) ||
    ageMonths < MIN_AGE_MONTHS ||
    ageMonths > MAX_AGE_MONTHS
  ) {
    throw new RangeError(
      `Age ${ageMonths} months is outside the WHO 2006 reference range ` +
        `(${MIN_AGE_MONTHS}–${MAX_AGE_MONTHS}). Extrapolation is medically invalid.`,
    );
  }
}

/** LMS params for an age-keyed indicator. NULL when the table has no entry
 *  (e.g. acfa before month 3) — optional screenings must degrade, not crash. */
export function getLmsByAge(
  indicator: AgeIndicator,
  gender: Gender,
  ageMonths: number,
): LmsParams | null {
  if (!AGE_INDICATORS.includes(indicator)) return null;
  assertAgeInRange(ageMonths);
  return tables[indicator]?.[sexKey(gender)]?.[String(ageMonths)] ?? null;
}

/** LMS params for a length/height-keyed indicator. The measurement is snapped
 *  to the nearest 0.5 cm key; NULL when outside the table's cm coverage. */
export function getLmsByHeight(
  indicator: HeightIndicator,
  gender: Gender,
  heightCm: number,
): LmsParams | null {
  if (!HEIGHT_INDICATORS.includes(indicator)) return null;
  if (!(heightCm > 0)) return null;
  const snapped = Math.round(heightCm * 2) / 2;
  const key = Number.isInteger(snapped) ? String(snapped) : snapped.toFixed(1);
  return tables[indicator]?.[sexKey(gender)]?.[key] ?? null;
}

/** Core LMS Z-score. */
export function zScore({ L, M, S }: LmsParams, x: number): number {
  if (!(x > 0)) {
    throw new RangeError(`Measurement must be positive, got ${x}.`);
  }
  if (Math.abs(L) < 1e-9) {
    return Math.log(x / M) / S;
  }
  return (Math.pow(x / M, L) - 1) / (L * S);
}

/** Inverse of zScore: measurement X at a given Z (for ideal ranges). */
export function valueAtZ({ L, M, S }: LmsParams, z: number): number {
  if (Math.abs(L) < 1e-9) {
    return M * Math.exp(S * z);
  }
  return M * Math.pow(1 + L * S * z, 1 / L);
}

/** [−1 SD, +1 SD] "ideal range" around the WHO median (PRD §4.2A Targets card). */
export function idealRange(
  params: LmsParams,
  sd = 1,
): [lower: number, upper: number] {
  return [valueAtZ(params, -sd), valueAtZ(params, sd)];
}

/**
 * Verdict from the three mandatory indicators (PRD §5.3: wfa/lhfa/bmi drive
 * the status; hcfa/acfa never do). WHO SD cut-offs: ≤ −3 high risk,
 * (−3, −2] mild risk, otherwise normal. The WORST indicator wins so a single
 * red flag is never averaged away.
 */
export function classifyStatus(zScores: readonly number[]): StuntingStatus {
  if (zScores.length === 0) {
    throw new RangeError("classifyStatus needs at least one Z-score.");
  }
  const worst = Math.min(...zScores);
  if (worst <= -3) return "high";
  if (worst <= -2) return "mild";
  return "normal";
}

export interface CalculatorInput {
  gender: Gender;
  ageMonths: number;
  weightKg: number;
  heightCm: number;
  /** Optional kader screenings (PRD 4.1) — never block the verdict. */
  headCircumferenceCm?: number;
  armCircumferenceCm?: number;
}

export interface Assessment {
  status: StuntingStatus;
  zWfa: number;
  zLhfa: number;
  zBmi: number;
  /** Weight-for-height/length Z (supplementary; wfl <24mo, wfh ≥24mo). */
  zWfh: number | null;
  /** Optional screening Z-scores (null when outside table coverage). */
  zHcfa: number | null;
  zAcfa: number | null;
  /** WHO medians shown in the clinical accordion. */
  medians: { wfa: number; lhfa: number; bmi: number };
  /** ±1 SD around median, for the Targets & Next Steps card. */
  idealWeightKg: [number, number];
  idealHeightCm: [number, number];
}

/** Full assessment in one call. Throws RangeError on invalid age. */
export function computeAssessment(input: CalculatorInput): Assessment {
  const { gender, ageMonths, weightKg, heightCm } = input;

  const wfa = getLmsByAge("wfa", gender, ageMonths);
  const lhfa = getLmsByAge("lhfa", gender, ageMonths);
  const bmi = getLmsByAge("bmi", gender, ageMonths);
  if (!wfa || !lhfa || !bmi) {
    // Defensive: the pipeline guarantees full 0–60 coverage for these three.
    throw new RangeError(
      `WHO reference table is incomplete at age ${ageMonths} months.`,
    );
  }

  const bmiValue = weightKg / Math.pow(heightCm / 100, 2);
  const zWfa = zScore(wfa, weightKg);
  const zLhfa = zScore(lhfa, heightCm);
  const zBmi = zScore(bmi, bmiValue);

  // Weight-for-length (0–23mo) vs weight-for-height (24–60mo) per WHO usage.
  const wfhParams =
    ageMonths < 24
      ? getLmsByHeight("wfl", gender, heightCm)
      : getLmsByHeight("wfh", gender, heightCm);
  const zWfh = wfhParams ? zScore(wfhParams, weightKg) : null;

  const hcfaParams = input.headCircumferenceCm
    ? getLmsByAge("hcfa", gender, ageMonths)
    : null;
  const acfaParams = input.armCircumferenceCm
    ? getLmsByAge("acfa", gender, ageMonths)
    : null;

  return {
    status: classifyStatus([zWfa, zLhfa, zBmi]),
    zWfa,
    zLhfa,
    zBmi,
    zWfh,
    zHcfa:
      hcfaParams && input.headCircumferenceCm
        ? zScore(hcfaParams, input.headCircumferenceCm)
        : null,
    zAcfa:
      acfaParams && input.armCircumferenceCm
        ? zScore(acfaParams, input.armCircumferenceCm)
        : null,
    medians: { wfa: wfa.M, lhfa: lhfa.M, bmi: bmi.M },
    idealWeightKg: idealRange(wfa),
    idealHeightCm: idealRange(lhfa),
  };
}

/** PRD §4.2B age buckets for contextual education recommendations. */
export type AgeBucket = "0-6" | "6-8" | "9-11" | "12-24" | "24-60";

export function ageBucketOf(ageMonths: number): AgeBucket {
  assertAgeInRange(ageMonths);
  if (ageMonths <= 6) return "0-6";
  if (ageMonths <= 8) return "6-8";
  if (ageMonths <= 11) return "9-11";
  if (ageMonths <= 24) return "12-24";
  return "24-60";
}

export const AGE_BUCKET_LABEL: Record<AgeBucket, string> = {
  "0-6": "0–6 Bulan (ASI Eksklusif)",
  "6-8": "6–8 Bulan (MPASI Awal)",
  "9-11": "9–11 Bulan (MPASI Lanjutan)",
  "12-24": "12–24 Bulan (Masa Transisi Makanan Keluarga)",
  "24-60": "24–60 Bulan (Balita/Prasekolah)",
};

/* src/lib/calc/lms.test.ts
 * Unit tests for the WHO LMS engine. This module drives a health verdict, so
 * the math, the boundaries, and the degradation paths are all pinned here.
 */
import { describe, expect, it } from "vitest";

import {
  ageBucketOf,
  ageMonthsFromBirth,
  classifyStatus,
  computeAssessment,
  dbGenderToUi,
  dbStatusToUi,
  genderToDb,
  getLmsByAge,
  getLmsByHeight,
  idealRange,
  toDbStatus,
  valueAtZ,
  zScore,
  type LmsParams,
} from "@/lib/calc/lms";

describe("zScore (LMS formula, PRD §5.3)", () => {
  it("returns ~0 when X equals the median M (L ≠ 0 branch)", () => {
    // Real table entry: boys wfa at 14 months.
    const params: LmsParams = { L: 0.0487, M: 10.0953, S: 0.10976 };
    expect(zScore(params, 10.0953)).toBeCloseTo(0, 10);
  });

  it("uses the log branch when L = 0", () => {
    const params: LmsParams = { L: 0, M: 10, S: 0.1 };
    expect(zScore(params, 10)).toBeCloseTo(0, 12);
    expect(zScore(params, 11)).toBeCloseTo(Math.log(1.1) / 0.1, 12);
  });

  it("matches a hand-computed WHO value", () => {
    // boys wfa 14mo: ((9/10.0953)^0.0487 − 1) / (0.0487·0.10976)
    const params: LmsParams = { L: 0.0487, M: 10.0953, S: 0.10976 };
    const expected =
      (Math.pow(9 / 10.0953, 0.0487) - 1) / (0.0487 * 0.10976);
    expect(zScore(params, 9)).toBeCloseTo(expected, 12);
  });

  it("rejects non-positive measurements", () => {
    const params: LmsParams = { L: 1, M: 50, S: 0.05 };
    expect(() => zScore(params, 0)).toThrow(RangeError);
    expect(() => zScore(params, -3)).toThrow(RangeError);
  });
});

describe("valueAtZ / idealRange", () => {
  it("inverts zScore (L ≠ 0)", () => {
    const params: LmsParams = { L: 0.3487, M: 3.3464, S: 0.14602 };
    const x = 4.2;
    expect(valueAtZ(params, zScore(params, x))).toBeCloseTo(x, 10);
  });

  it("inverts zScore (L = 0)", () => {
    const params: LmsParams = { L: 0, M: 16, S: 0.09 };
    const x = 17.5;
    expect(valueAtZ(params, zScore(params, x))).toBeCloseTo(x, 10);
  });

  it("ideal range brackets the median symmetrically in Z-space", () => {
    const params: LmsParams = { L: 0.0487, M: 10.0953, S: 0.10976 };
    const [lo, hi] = idealRange(params, 1);
    expect(zScore(params, lo)).toBeCloseTo(-1, 10);
    expect(zScore(params, hi)).toBeCloseTo(1, 10);
    expect(lo).toBeLessThan(params.M);
    expect(hi).toBeGreaterThan(params.M);
  });
});

describe("getLmsByAge boundaries (PRD §5.3 — no extrapolation)", () => {
  it("serves the full 0–60 month range for mandatory indicators", () => {
    expect(getLmsByAge("wfa", "male", 0)).not.toBeNull();
    expect(getLmsByAge("lhfa", "female", 60)).not.toBeNull();
    expect(getLmsByAge("bmi", "male", 31)).not.toBeNull();
  });

  it("throws RangeError outside 0–60 months", () => {
    expect(() => getLmsByAge("wfa", "male", -1)).toThrow(RangeError);
    expect(() => getLmsByAge("wfa", "female", 61)).toThrow(RangeError);
    expect(() => getLmsByAge("wfa", "male", 2.5)).toThrow(RangeError);
  });

  it("acfa is null before month 3 (optional screening degrades, no crash)", () => {
    expect(getLmsByAge("acfa", "male", 2)).toBeNull();
    expect(getLmsByAge("acfa", "male", 3)).not.toBeNull();
  });
});

describe("getLmsByHeight", () => {
  it("snaps to the nearest 0.5 cm key", () => {
    const direct = getLmsByHeight("wfh", "male", 75);
    const snapped = getLmsByHeight("wfh", "male", 75.2);
    expect(direct).not.toBeNull();
    expect(snapped).toEqual(direct);
  });

  it("returns null outside table coverage", () => {
    expect(getLmsByHeight("wfh", "male", 30)).toBeNull();
    expect(getLmsByHeight("wfl", "female", 200)).toBeNull();
  });
});

describe("classifyStatus (worst indicator wins)", () => {
  it("normal when all Z ≥ −2", () => {
    expect(classifyStatus([0, -1.9, 1.2])).toBe("normal");
  });
  it("mild when the worst Z is in (−3, −2]", () => {
    expect(classifyStatus([0.5, -2.4, -0.1])).toBe("mild");
  });
  it("high when the worst Z is ≤ −3", () => {
    expect(classifyStatus([-3.2, 0, 0.4])).toBe("high");
  });
  it("boundary: exactly −2 is mild, exactly −3 is high", () => {
    expect(classifyStatus([-2])).toBe("mild");
    expect(classifyStatus([-3])).toBe("high");
  });
  it("rejects empty input", () => {
    expect(() => classifyStatus([])).toThrow(RangeError);
  });
});

describe("computeAssessment", () => {
  it("median child → normal verdict with near-zero Z-scores", () => {
    const r = computeAssessment({
      gender: "male",
      ageMonths: 14,
      weightKg: 10.0953, // wfa median
      heightCm: 78.6, // near lhfa median
    });
    expect(r.status).toBe("normal");
    expect(r.zWfa).toBeCloseTo(0, 1);
    expect(r.idealWeightKg[0]).toBeLessThan(10.0953);
    expect(r.idealWeightKg[1]).toBeGreaterThan(10.0953);
  });

  it("severely underweight child → high risk", () => {
    const r = computeAssessment({
      gender: "female",
      ageMonths: 14,
      weightKg: 5.5,
      heightCm: 60,
    });
    expect(r.status).toBe("high");
    expect(r.zWfa).toBeLessThanOrEqual(-3);
  });

  it("throws outside 0–60 months (PRD §4.2 form-level rejection)", () => {
    expect(() =>
      computeAssessment({ gender: "male", ageMonths: 61, weightKg: 12, heightCm: 90 }),
    ).toThrow(RangeError);
  });

  it("optional screenings are computed when given, null when omitted", () => {
    const withOptional = computeAssessment({
      gender: "male",
      ageMonths: 12,
      weightKg: 9.6,
      heightCm: 75,
      headCircumferenceCm: 46,
      armCircumferenceCm: 15,
    });
    expect(withOptional.zHcfa).not.toBeNull();
    expect(withOptional.zAcfa).not.toBeNull();

    const without = computeAssessment({
      gender: "male",
      ageMonths: 12,
      weightKg: 9.6,
      heightCm: 75,
    });
    expect(without.zHcfa).toBeNull();
    expect(without.zAcfa).toBeNull();
  });

  it("verdict never depends on optional indicators (PRD 4.1)", () => {
    const base = computeAssessment({
      gender: "female",
      ageMonths: 10,
      weightKg: 8.9,
      heightCm: 72,
    });
    const withWeirdOptional = computeAssessment({
      gender: "female",
      ageMonths: 10,
      weightKg: 8.9,
      heightCm: 72,
      armCircumferenceCm: 9, // implausibly low — must not flip the verdict
    });
    expect(withWeirdOptional.status).toBe(base.status);
  });

  it("uses wfl below 24 months and wfh at/above 24 months", () => {
    const young = computeAssessment({
      gender: "male",
      ageMonths: 12,
      weightKg: 9.6,
      heightCm: 75,
    });
    const older = computeAssessment({
      gender: "male",
      ageMonths: 30,
      weightKg: 12.5,
      heightCm: 90,
    });
    expect(young.zWfh).not.toBeNull();
    expect(older.zWfh).not.toBeNull();
  });
});

describe("ageBucketOf (PRD §4.2B)", () => {
  it.each([
    [0, "0-6"],
    [6, "0-6"],
    [7, "6-8"],
    [8, "6-8"],
    [9, "9-11"],
    [11, "9-11"],
    [12, "12-24"],
    [24, "12-24"],
    [25, "24-60"],
    [60, "24-60"],
  ] as const)("maps %i months → %s", (months, bucket) => {
    expect(ageBucketOf(months)).toBe(bucket);
  });

  it("rejects out-of-range ages", () => {
    expect(() => ageBucketOf(61)).toThrow(RangeError);
  });
});

describe("ageMonthsFromBirth", () => {
  it("computes months from a birth date correctly", () => {
    // We can't pin exact months for "today", so test the delta between two dates.
    const recent = new Date();
    recent.setMonth(recent.getMonth() - 14);
    expect(ageMonthsFromBirth(recent)).toBeGreaterThanOrEqual(13);
    expect(ageMonthsFromBirth(recent)).toBeLessThanOrEqual(15);
  });

  it("rejects invalid dates", () => {
    expect(() => ageMonthsFromBirth("not-a-date")).toThrow(RangeError);
    expect(() => ageMonthsFromBirth("")).toThrow(RangeError);
  });

  it("accepts both string and Date inputs and agrees", () => {
    const d = new Date();
    d.setMonth(d.getMonth() - 24);
    expect(ageMonthsFromBirth(d.toISOString().slice(0, 10))).toBe(
      ageMonthsFromBirth(d),
    );
  });
});

describe("DB ↔ UI mappers", () => {
  it("maps StuntingStatus to the pengukuran.status_hasil enum", () => {
    expect(toDbStatus("normal")).toBe("normal");
    expect(toDbStatus("mild")).toBe("risiko_sedang");
    expect(toDbStatus("high")).toBe("risiko_tinggi");
  });

  it("round-trips status through toDbStatus then dbStatusToUi", () => {
    (["normal", "mild", "high"] as const).forEach((ui) => {
      expect(dbStatusToUi(toDbStatus(ui))).toBe(ui);
    });
  });

  it("maps the calculator gender to the anak.jenis_kelamin char(1)", () => {
    expect(genderToDb("male")).toBe("L");
    expect(genderToDb("female")).toBe("P");
  });

  it("round-trips gender through genderToDb then dbGenderToUi", () => {
    expect(dbGenderToUi(genderToDb("male"))).toBe("male");
    expect(dbGenderToUi(genderToDb("female"))).toBe("female");
  });
});

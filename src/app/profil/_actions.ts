"use server";

/* src/app/profil/_actions.ts
 * Server actions for /profil: consent, add-child, save-measurement.
 *
 * Snapshot pattern (Master Doc §3): the LMS Z-scores + status are recomputed
 * on the server at INSERT time (never trust persisted raw inputs to remain
 * chart-accurate later), and frozen into the `pengukuran` row. RLS enforces
 * ownership; `consent_given_at` is the PDP gate for anak writes.
 */
import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import {
  ageMonthsFromBirth,
  computeAssessment,
  dbGenderToUi,
  genderToDb,
  MAX_AGE_MONTHS,
  MIN_AGE_MONTHS,
  toDbStatus,
} from "@/lib/calc/lms";
import {
  addChildSchema,
  measurementSchema,
  type AddChildValues,
  type MeasurementValues,
} from "@/lib/calc/profile-schema";

export type ActionResult =
  | { ok: true }
  | { ok: false; error: string };

async function getAuthUserId(): Promise<string | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user?.id ?? null;
}

export async function acceptConsentAction(): Promise<ActionResult> {
  const userId = await getAuthUserId();
  if (!userId) return { ok: false, error: "Sesi berakhir, silakan masuk lagi." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("users")
    .update({ consent_given_at: new Date().toISOString() })
    .eq("id", userId)
    .is("deleted_at", null);

  if (error) {
    console.error("[actions] acceptConsent failed:", error.message);
    return { ok: false, error: "Gagal menyimpan persetujuan. Coba lagi." };
  }
  revalidatePath("/profil");
  revalidatePath("/layanan-surat");
  return { ok: true };
}

export async function addChildAction(
  raw: AddChildValues,
): Promise<ActionResult> {
  const userId = await getAuthUserId();
  if (!userId) return { ok: false, error: "Sesi berakhir, silakan masuk lagi." };

  const parsed = addChildSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Input tidak valid." };
  }
  const { nama, jenisKelamin, tanggalLahir } = parsed.data;

  const supabase = await createClient();
  // RLS already requires consent_given_at for INSERT, but we fail loud here so
  // the UI can explain rather than emit a generic PostgREST error.
  const { data: me, error: meErr } = await supabase
    .from("users")
    .select("consent_given_at")
    .eq("id", userId)
    .maybeSingle();
  if (meErr) {
    console.error("[actions] addChild consent check failed:", meErr.message);
    return { ok: false, error: "Gagal memeriksa persetujuan. Coba lagi." };
  }
  if (!me?.consent_given_at) {
    return { ok: false, error: "Anda belum menyetujui pengumpulan data." };
  }

  const { error } = await supabase
    .from("anak")
    .insert({
      user_id: userId,
      nama_anak: nama,
      jenis_kelamin: jenisKelamin,
      tanggal_lahir: tanggalLahir,
    });

  if (error) {
    console.error("[actions] addChild insert failed:", error.message);
    return { ok: false, error: "Gagal menambah anak. Coba lagi." };
  }
  revalidatePath("/profil");
  return { ok: true };
}

export async function saveMeasurementAction(
  raw: MeasurementValues,
): Promise<ActionResult> {
  const userId = await getAuthUserId();
  if (!userId) return { ok: false, error: "Sesi berakhir, silakan masuk lagi." };

  const parsed = measurementSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Input tidak valid." };
  }
  const { anakId, tanggalUkur, beratBadanKg, tinggiBadanCm, lingkarKepalaCm, lingkarLenganCm } =
    parsed.data;

  const supabase = await createClient();
  // RLS restricts SELECT to owned children — no manual `user_id` check needed.
  const { data: anak, error: anakErr } = await supabase
    .from("anak")
    .select("id, jenis_kelamin, tanggal_lahir")
    .eq("id", anakId)
    .is("deleted_at", null)
    .maybeSingle();
  if (anakErr || !anak) {
    return { ok: false, error: "Data anak tidak ditemukan." };
  }

  // Umur bulan — single source of truth is tanggal_lahir (not the form input).
  const umurBulan = ageMonthsFromBirth(anak.tanggal_lahir);
  if (umurBulan < MIN_AGE_MONTHS || umurBulan > MAX_AGE_MONTHS) {
    return {
      ok: false,
      error: `Usia anak saat ini ${umurBulan} bulan, di luar rentang WHO (0–60). Ukur diminta melalui Posyandu.`,
    };
  }

  // Snapshot: recompute Z-scores & status here (never store raw-to-be-derived-later).
  const assessment = computeAssessment({
    gender: dbGenderToUi(anak.jenis_kelamin),
    ageMonths: umurBulan,
    weightKg: beratBadanKg,
    heightCm: tinggiBadanCm,
    headCircumferenceCm: lingkarKepalaCm,
    armCircumferenceCm: lingkarLenganCm,
  });

  const { error } = await supabase.from("pengukuran").insert({
    anak_id: anakId,
    tanggal_ukur: tanggalUkur,
    umur_bulan: umurBulan,
    berat_badan_kg: beratBadanKg,
    tinggi_badan_cm: tinggiBadanCm,
    z_score_tbu: assessment.zLhfa,
    z_score_bbu: assessment.zWfa,
    z_score_lingkar_kepala: assessment.zHcfa,
    z_score_lingkar_lengan: assessment.zAcfa,
    status_hasil: toDbStatus(assessment.status),
  });

  if (error) {
    console.error("[actions] saveMeasurement insert failed:", error.message);
    return { ok: false, error: "Gagal menyimpan pengukuran. Coba lagi." };
  }
  revalidatePath("/profil");
  return { ok: true };
}

// keep the gender mapper imported so tree-shaking doesn't drop it in dev builds
export { genderToDb };
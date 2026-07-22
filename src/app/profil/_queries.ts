/* src/app/profil/_queries.ts
 * Server-only read helpers. Pure data shape — no JSX — so they can be reused
 * by the page (RSC) and any future API route, and the type strip stays clean.
 */
import { createClient } from "@/lib/supabase/server";
import { ageMonthsFromBirth, MAX_AGE_MONTHS } from "@/lib/calc/lms";

// Re-use the public ArticleCardData type from /edukasi.
import type { ArticleCardData } from "@/app/edukasi/page";

export interface ChildRow {
  id: string;
  nama_anak: string;
  jenis_kelamin: "L" | "P";
  tanggal_lahir: string;
}

export interface MeasurementRow {
  id: string;
  tanggal_ukur: string;
  umur_bulan: number;
  berat_badan_kg: number;
  tinggi_badan_cm: number;
  z_score_tbu: number | null;
  z_score_bbu: number | null;
  status_hasil: "normal" | "risiko_sedang" | "risiko_tinggi";
}

export interface ChildWithMeasurements extends ChildRow {
  measurements: MeasurementRow[];
  ageMonthsNow: number;
  /** Whether the child is still within the WHO 0–60 month calculator range. */
  inRange: boolean;
}

export interface ProfileData {
  user: { nama_lengkap: string; email: string; consent_given_at: string | null };
  children: ChildWithMeasurements[];
}

export interface ChildSummary {
  id: string;
  nama_anak: string;
  jenis_kelamin: "L" | "P";
  ageMonthsNow: number;
  inRange: boolean;
}

/** Lightweight children list for the Home save-dialog — no measurements fetched. */
export async function getChildrenSummary(): Promise<ChildSummary[] | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from("anak")
    .select("id, nama_anak, jenis_kelamin, tanggal_lahir")
    .eq("user_id", user.id)
    .is("deleted_at", null)
    .order("tanggal_lahir", { ascending: true });
  if (error) {
    console.error("[queries] getChildrenSummary failed:", error.message);
    return [];
  }
  return (data ?? []).map((a) => {
    const ageMonthsNow = ageMonthsFromBirth(a.tanggal_lahir);
    return {
      id: a.id,
      nama_anak: a.nama_anak,
      jenis_kelamin: a.jenis_kelamin,
      ageMonthsNow,
      inRange: ageMonthsNow >= 0 && ageMonthsNow <= MAX_AGE_MONTHS,
    };
  });
}

/**
 * Pre-fetch published edukasi grouped by age bucket (kategori_umur).
 * Each bucket contains ≤3 articles + ≤3 recipes — enough for the contextual
 * recommendation cards on the home page and the education directory ("Lihat
 * semua" links to /edukasi).
 */
export async function getEdukasiRecommendations(): Promise<
  Record<string, { artikel_gizi: ArticleCardData[]; resep_mpasi: ArticleCardData[] }>
> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("edukasi")
    .select("id, judul, slug, tipe_konten, kategori_umur, thumbnail_url, created_at")
    .eq("published", true)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[queries] getEdukasiRecommendations failed:", error.message);
    return {};
  }

  const grouped: Record<string, { artikel_gizi: ArticleCardData[]; resep_mpasi: ArticleCardData[] }> = {};
  for (const item of data ?? []) {
    const bucket = item.kategori_umur;
    if (!grouped[bucket]) grouped[bucket] = { artikel_gizi: [], resep_mpasi: [] };
    const arr = grouped[bucket][item.tipe_konten as "artikel_gizi" | "resep_mpasi"];
    if (arr.length < 3) {
      arr.push({
        id: item.id,
        judul: item.judul,
        slug: item.slug,
        tipe_konten: item.tipe_konten,
        kategori_umur: item.kategori_umur,
        thumbnail_url: item.thumbnail_url,
        created_at: item.created_at,
      });
    }
  }
  return grouped;
}

export async function getProfileData(): Promise<ProfileData> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    throw new Error("Not authenticated");
  }

  const { data: me, error: meErr } = await supabase
    .from("users")
    .select("nama_lengkap, email, consent_given_at")
    .eq("id", user.id)
    .maybeSingle();
  if (meErr || !me) throw new Error("Profile not found");
  const meRow = me as ProfileData["user"];

  const { data: anakRows, error: anakErr } = await supabase
    .from("anak")
    .select("id, nama_anak, jenis_kelamin, tanggal_lahir")
    .eq("user_id", user.id)
    .is("deleted_at", null)
    .order("tanggal_lahir", { ascending: true });
  if (anakErr) throw anakErr;
  const children = (anakRows ?? []) as unknown as ChildRow[];

  const withMeasurements: ChildWithMeasurements[] = await Promise.all(
    children.map(async (c) => {
      const { data: m, error: mErr } = await supabase
        .from("pengukuran")
        .select(
          "id, tanggal_ukur, umur_bulan, berat_badan_kg, tinggi_badan_cm, z_score_tbu, z_score_bbu, status_hasil",
        )
        .eq("anak_id", c.id)
        .is("deleted_at", null)
        .order("umur_bulan", { ascending: true });
      if (mErr) throw mErr;
      const measurements = (m ?? []) as unknown as MeasurementRow[];
      const ageMonthsNow = ageMonthsFromBirth(c.tanggal_lahir);
      return {
        ...c,
        measurements,
        ageMonthsNow,
        inRange: ageMonthsNow >= 0 && ageMonthsNow <= MAX_AGE_MONTHS,
      };
    }),
  );

  return { user: meRow, children: withMeasurements };
}
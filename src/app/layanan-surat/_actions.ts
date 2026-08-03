"use server";

/* src/app/layanan-surat/_actions.ts
 * Citizen-facing Phase 2 server actions: progressive profiling, letter
 * submission (snapshot), and reading their letter history.
 */
import { revalidatePath } from "next/cache";

import { createClient, createServiceClient } from "@/lib/supabase/server";
import type { IsianSnapshot, StatusPermohonan, WargaProfilData } from "@/lib/surat/types";

export type ActionResult<T = void> =
  | { ok: true; data?: T }
  | { ok: false; error: string };

async function getAuthUserId(): Promise<string | null> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return user?.id ?? null;
}

// ---------- Warga Profil (progressive profiling) ----------

/** Saves/creates the warga_profil (NIK/KK). RLS enforces consent gate. */
export async function saveWargaProfilAction(
  data: WargaProfilData,
): Promise<ActionResult> {
  const userId = await getAuthUserId();
  if (!userId) return { ok: false, error: "Sesi berakhir, silakan masuk lagi." };

  const nik = data.nik.trim();
  if (!/^[0-9]{16}$/.test(nik)) {
    return { ok: false, error: "NIK harus 16 digit angka." };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("warga_profil").upsert(
    {
      user_id: userId,
      nik,
      no_kk: data.no_kk?.trim() || null,
      nama: data.nama.trim(),
      tempat_lahir: data.tempat_lahir.trim(),
      tanggal_lahir: data.tanggal_lahir,
      agama: data.agama.trim(),
      pekerjaan: data.pekerjaan.trim(),
      alamat: data.alamat.trim(),
    },
    { onConflict: "user_id" },
  );
  if (error) {
    // NIK duplicate → DB unique violation (code 23505).
    if (error.code === "23505") {
      return { ok: false, error: "NIK sudah terdaftar pada akun lain." };
    }
    console.error("[layanan-surat] saveWargaProfil failed:", error.message);
    return { ok: false, error: "Gagal menyimpan profil. Coba lagi." };
  }
  revalidatePath("/layanan-surat");
  return { ok: true };
}

/** Reads the caller's warga_profil (null if not yet filled). */
export async function getWargaProfilAction(): Promise<ActionResult<WargaProfilData | null>> {
  const userId = await getAuthUserId();
  if (!userId) return { ok: false, error: "Sesi berakhir." };
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("warga_profil")
    .select("nik,no_kk,nama,tempat_lahir,tanggal_lahir,agama,pekerjaan,alamat")
    .eq("user_id", userId)
    .is("deleted_at", null)
    .maybeSingle();
  if (error) {
    console.error("[layanan-surat] getWargaProfil failed:", error.message);
    return { ok: false, error: "Gagal memuat profil." };
  }
  return { ok: true, data: (data as WargaProfilData) ?? null };
}

// ---------- Letter submission ----------

/**
 * Creates a new letter request. `snapshot` must contain the exact identity +
 * service fields filled by the citizen at submit time (Snapshot pattern).
 */
export async function submitPermohonanAction(
  jenisSuratId: string,
  snapshot: IsianSnapshot,
): Promise<ActionResult<{ id: string }>> {
  const userId = await getAuthUserId();
  if (!userId) return { ok: false, error: "Sesi berakhir, silakan masuk lagi." };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("permohonan_surat")
    .insert({
      user_id: userId,
      jenis_surat_id: jenisSuratId,
      data_isian_snapshot: snapshot,
      status: "menunggu",
    })
    .select("id")
    .single();
  if (error) {
    console.error("[layanan-surat] submitPermohonan failed:", error.message);
    return { ok: false, error: "Gagal mengajukan surat. Coba lagi." };
  }
  revalidatePath("/layanan-surat");
  return { ok: true, data: { id: data.id } };
}

// ---------- Letter history (for /profil tab & /layanan-surat) ----------

export interface MyLetterRow {
  id: string;
  status: StatusPermohonan;
  catatan_admin: string | null;
  nomor_surat_final: string | null;
  kode_verifikasi: string | null;
  pdf_final_url: string | null;
  disetujui_at: string | null;
  created_at: string;
  updated_at: string;
  processing_at: string | null;
  jenis_surat: { nama_surat: string; kode_klasifikasi: string } | null;
}

export async function getMyLettersAction(): Promise<ActionResult<MyLetterRow[]>> {
  const userId = await getAuthUserId();
  if (!userId) return { ok: false, error: "Sesi berakhir." };
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("permohonan_surat")
    .select(
      "id, status, catatan_admin, nomor_surat_final, kode_verifikasi, pdf_final_url, disetujui_at, created_at, updated_at, processing_at, jenis_surat:master_jenis_surat(nama_surat, kode_klasifikasi)",
    )
    .eq("user_id", userId)
    .is("deleted_at", null)
    .order("created_at", { ascending: false });
  if (error) {
    console.error("[layanan-surat] getMyLetters failed:", error.message);
    return { ok: false, error: "Gagal memuat riwayat surat." };
  }
  return { ok: true, data: (data ?? []) as unknown as MyLetterRow[] };
}

// ---------- Download final PDF ----------

/**
 * Generates a short-lived signed URL for the citizen's approved PDF (private
 * bucket). Verifies ownership first (RLS: user_id = auth.uid()).
 * Returns null when the PDF has been purged (>3 days retention).
 */
export async function downloadLetterPdfAction(
  permohonanId: string,
): Promise<ActionResult<{ url: string }>> {
  const userId = await getAuthUserId();
  if (!userId) return { ok: false, error: "Sesi berakhir." };

  const supabase = await createClient();
  const { data: row, error } = await supabase
    .from("permohonan_surat")
    .select("pdf_final_url, status")
    .eq("id", permohonanId)
    .eq("user_id", userId)
    .is("deleted_at", null)
    .maybeSingle();
  if (error || !row) return { ok: false, error: "Surat tidak ditemukan." };
  if (row.status !== "disetujui" || !row.pdf_final_url) {
    return {
      ok: false,
      error: "PDF belum tersedia. Hubungi kantor desa bila masa unduh telah berakhir.",
    };
  }

  const svc = createServiceClient();
  const { data: signed, error: signedErr } = await svc.storage
    .from("surat-pdf")
    .createSignedUrl(row.pdf_final_url, 3600);
  if (signedErr || !signed?.signedUrl) {
    return { ok: false, error: "Gagal membuat tautan unduh." };
  }
  return { ok: true, data: { url: signed.signedUrl } };
}

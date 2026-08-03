"use server";

/* src/app/admin/surat/_actions.ts
 * Admin Desa Phase 2 server actions: approval queue, approve (fires worker),
 * request revision, reject, walk-in create, Kades config.
 * Middleware + layout guard role=admin_desa; actions re-check as defense.
 */
import { revalidatePath } from "next/cache";

import { createClient, createServiceClient } from "@/lib/supabase/server";
import { getWorkerConfig } from "@/lib/surat/config";
import { formatNomorSurat, generateKodeVerifikasi } from "@/lib/surat/nomor";
import type { IsianSnapshot } from "@/lib/surat/types";

export type ActionResult<T = void> =
  | { ok: true; data?: T }
  | { ok: false; error: string };

async function assertAdmin(): Promise<string> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Sesi berakhir");
  const { data: profile } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();
  if (!profile || profile.role !== "admin_desa") {
    throw new Error("Akses ditolak");
  }
  return user.id;
}

// ---------- Approval queue ----------

export interface QueueItem {
  id: string;
  status: string;
  catatan_admin: string | null;
  processing_at: string | null;
  data_isian_snapshot: IsianSnapshot;
  created_at: string;
  jenis_surat: { nama_surat: string; kode_klasifikasi: string } | null;
}

export async function getApprovalQueueAction(
  status: "menunggu" | "revisi" = "menunggu",
): Promise<ActionResult<QueueItem[]>> {
  try {
    await assertAdmin();
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Akses ditolak" };
  }
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("permohonan_surat")
    .select(
      "id, status, catatan_admin, processing_at, data_isian_snapshot, created_at, jenis_surat:master_jenis_surat(nama_surat, kode_klasifikasi)",
    )
    .eq("status", status)
    .is("deleted_at", null)
    .order("created_at", { ascending: true });
  if (error) {
    console.error("[admin/surat] getApprovalQueue failed:", error.message);
    return { ok: false, error: "Gagal memuat antrian." };
  }
  // Supabase returns the FK relation as an array; cast the known shape.
  return { ok: true, data: (data ?? []) as unknown as QueueItem[] };
}

/**
 * Approve: mark processing_at, then fire the VPS worker (HTTP push). The UI
 * polls getLetterStatus until the worker finishes (status changes) or the
 * processing_at goes stale. Returns immediately — PDF render is async.
 */
export async function approveAction(permohonanId: string): Promise<ActionResult> {
  let adminId: string;
  try {
    adminId = await assertAdmin();
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Akses ditolak" };
  }

  const supabase = await createClient();
  // Guard: only 'menunggu' can be approved (prevents double-approve while rendering).
  const { data: updated, error } = await supabase
    .from("permohonan_surat")
    .update({ processing_at: new Date().toISOString(), admin_verifikator_id: adminId })
    .eq("id", permohonanId)
    .eq("status", "menunggu")
    .is("deleted_at", null)
    .select("id")
    .maybeSingle();
  if (error || !updated) {
    return { ok: false, error: "Permohonan tidak bisa disetujui (bukan status menunggu)." };
  }

  // DEV MODE: if WORKER_URL is unset or 'dev', approve inline without a PDF
  // worker so the full frontend flow can be tested locally (nomor + kode +
  // status=disetujui, but no pdf_final_url). Production must set WORKER_URL.
  const workerUrl = process.env.WORKER_URL;
  if (!workerUrl || workerUrl === "dev") {
    return approveInline(permohonanId, supabase);
  }

  // Fire the worker.
  try {
    const cfg = getWorkerConfig();
    const res = await fetch(`${cfg.url}/render`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${cfg.secret}`,
      },
      body: JSON.stringify({ permohonanId }),
      // Vercel server action: allow up to ~60s for the worker (default ok).
      signal: AbortSignal.timeout(60_000),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      console.error("[admin/surat] worker render failed:", res.status, body);
      // Clear processing marker so the admin can retry.
      await supabase
        .from("permohonan_surat")
        .update({ processing_at: null })
        .eq("id", permohonanId);
      return { ok: false, error: "Gagal memicu render PDF. Coba lagi." };
    }
  } catch (err) {
    console.error("[admin/surat] worker call error:", err);
    await supabase
      .from("permohonan_surat")
      .update({ processing_at: null })
      .eq("id", permohonanId);
    return { ok: false, error: "Worker tidak merespons. Coba lagi." };
  }

  revalidatePath("/admin/surat");
  return { ok: true };
}

/**
 * DEV-only inline approval (no Puppeteer / PDF). Generates the letter number
 * (per kode_klasifikasi + tahun) & verification code, marks the letter as
 * disetujui. pdf_final_url stays NULL so the UI shows "hubungi kantor desa"
 * — matching the real 3-day retention behaviour. Not for production.
 */
async function approveInline(
  permohonanId: string,
  supabase: Awaited<ReturnType<typeof createClient>>,
): Promise<ActionResult> {
  try {
    const { data: perm } = await supabase
      .from("permohonan_surat")
      .select("jenis_surat:master_jenis_surat(kode_klasifikasi)")
      .eq("id", permohonanId)
      .maybeSingle();
    const kodeKlasifikasi = (
      (perm?.jenis_surat as unknown as { kode_klasifikasi: string }[] | { kode_klasifikasi: string } | null) ??
      null
    ) as { kode_klasifikasi: string } | { kode_klasifikasi: string }[] | null;

    const kode = Array.isArray(kodeKlasifikasi)
      ? kodeKlasifikasi[0]?.kode_klasifikasi
      : kodeKlasifikasi?.kode_klasifikasi;
    if (!kode) {
      return { ok: false, error: "Jenis surat tidak ditemukan." };
    }

    const tahun = new Date().getFullYear();

    // Read current counter for this kode+tahun, then increment.
    const { data: counter } = await supabase
      .from("nomor_surat_counter")
      .select("nomor_urut")
      .eq("kode_klasifikasi", kode)
      .eq("tahun", tahun)
      .maybeSingle();
    const nextUrut = ((counter?.nomor_urut as number | undefined) ?? 0) + 1;
    const nomorSurat = formatNomorSurat(kode, nextUrut);
    const kodeVerifikasi = generateKodeVerifikasi();

    await supabase.from("nomor_surat_counter").upsert(
      { kode_klasifikasi: kode, tahun, nomor_urut: nextUrut },
      { onConflict: "kode_klasifikasi,tahun" },
    );

    const { error: updErr } = await supabase
      .from("permohonan_surat")
      .update({
        status: "disetujui",
        nomor_surat_final: nomorSurat,
        kode_verifikasi: kodeVerifikasi,
        disetujui_at: new Date().toISOString(),
        processing_at: null,
      })
      .eq("id", permohonanId);
    if (updErr) {
      return { ok: false, error: `Gagal menyetujui: ${updErr.message}` };
    }
  } catch (err) {
    console.error("[admin/surat] approveInline failed:", err);
    return { ok: false, error: "Gagal menyetujui (dev). Coba lagi." };
  }

  revalidatePath("/admin/surat");
  return { ok: true };
}

/** Poll helper for the admin UI during PDF rendering. */
export async function getLetterStatusAction(
  permohonanId: string,
): Promise<ActionResult<{ status: string; processing: boolean; nomorSurat: string | null; pdfUrl: string | null }>> {
  try {
    await assertAdmin();
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Akses ditolak" };
  }
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("permohonan_surat")
    .select("status, processing_at, nomor_surat_final, pdf_final_url")
    .eq("id", permohonanId)
    .is("deleted_at", null)
    .maybeSingle();
  if (error || !data) return { ok: false, error: "Permohonan tidak ditemukan." };
  return {
    ok: true,
    data: {
      status: data.status,
      processing: !!data.processing_at,
      nomorSurat: data.nomor_surat_final,
      pdfUrl: data.pdf_final_url,
    },
  };
}

// ---------- Request revision ----------

export async function requestRevisionAction(
  permohonanId: string,
  catatan: string,
): Promise<ActionResult> {
  try {
    await assertAdmin();
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Akses ditolak" };
  }
  if (!catatan.trim()) return { ok: false, error: "Catatan revisi wajib diisi." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("permohonan_surat")
    .update({ status: "revisi", catatan_admin: catatan.trim() })
    .eq("id", permohonanId)
    .eq("status", "menunggu")
    .is("deleted_at", null);
  if (error) {
    console.error("[admin/surat] requestRevision failed:", error.message);
    return { ok: false, error: "Gagal meminta revisi." };
  }
  revalidatePath("/admin/surat");
  return { ok: true };
}

// ---------- Reject ----------

export async function rejectAction(permohonanId: string, alasan: string): Promise<ActionResult> {
  try {
    await assertAdmin();
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Akses ditolak" };
  }
  if (!alasan.trim()) return { ok: false, error: "Alasan penolakan wajib diisi." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("permohonan_surat")
    .update({ status: "ditolak", catatan_admin: alasan.trim() })
    .eq("id", permohonanId)
    .in("status", ["menunggu", "revisi"])
    .is("deleted_at", null);
  if (error) {
    console.error("[admin/surat] reject failed:", error.message);
    return { ok: false, error: "Gagal menolak permohonan." };
  }
  revalidatePath("/admin/surat");
  return { ok: true };
}

// ---------- Walk-in create ----------

export async function createWalkInAction(
  jenisSuratId: string,
  snapshot: IsianSnapshot,
): Promise<ActionResult<{ id: string }>> {
  let adminId: string;
  try {
    adminId = await assertAdmin();
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Akses ditolak" };
  }
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("permohonan_surat")
    .insert({
      user_id: null,
      admin_pembuat_id: adminId,
      jenis_surat_id: jenisSuratId,
      data_isian_snapshot: snapshot,
      status: "menunggu",
    })
    .select("id")
    .single();
  if (error) {
    console.error("[admin/surat] createWalkIn failed:", error.message);
    return { ok: false, error: "Gagal membuat surat walk-in." };
  }
  revalidatePath("/admin/surat");
  return { ok: true, data: { id: data.id } };
}

// ---------- Kades config ----------

export interface KadesConfig {
  nama_kades: string;
  nip_kades: string | null;
  jabatan: string | null;
  ttd_cap_url: string | null;
}

export async function getKadesConfigAction(): Promise<ActionResult<KadesConfig | null>> {
  try {
    await assertAdmin();
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Akses ditolak" };
  }
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("surat_kades_config")
    .select("nama_kades,nip_kades,jabatan,ttd_cap_url")
    .eq("id", 1)
    .maybeSingle();
  if (error) {
    console.error("[admin/surat] getKadesConfig failed:", error.message);
    return { ok: false, error: "Gagal memuat konfigurasi." };
  }
  return { ok: true, data: data ?? null };
}

export async function updateKadesConfigAction(input: {
  namaKades: string;
  nipKades?: string;
  jabatan?: string;
  ttdCapUrl?: string;
}): Promise<ActionResult> {
  try {
    await assertAdmin();
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Akses ditolak" };
  }
  if (!input.namaKades.trim()) return { ok: false, error: "Nama Kepala Desa wajib diisi." };

  const supabase = await createClient();
  const { error } = await supabase.from("surat_kades_config").upsert(
    {
      id: 1,
      nama_kades: input.namaKades.trim(),
      nip_kades: input.nipKades?.trim() || null,
      jabatan: input.jabatan?.trim() || "Kepala Desa",
      ttd_cap_url: input.ttdCapUrl?.trim() || null,
    },
    { onConflict: "id" },
  );
  if (error) {
    console.error("[admin/surat] updateKadesConfig failed:", error.message);
    return { ok: false, error: "Gagal menyimpan konfigurasi." };
  }
  revalidatePath("/admin/surat");
  return { ok: true };
}

// ---------- TTE upload ----------

/**
 * Upload Kades signature/stamp to the PRIVATE 'surat-ttd' bucket.
 * Returns the storage path (stored in surat_kades_config.ttd_cap_url).
 * Compression is done client-side before upload (browser-image-compression).
 */
export async function uploadTteAction(
  formData: FormData,
): Promise<{ ok: false; error: string } | { ok: true; path: string }> {
  try {
    await assertAdmin();
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Akses ditolak" };
  }
  const file = formData.get("file") as File | null;
  if (!file || !(file instanceof File)) {
    return { ok: false, error: "File tidak ditemukan." };
  }
  if (!file.type.startsWith("image/")) {
    return { ok: false, error: "File harus berupa gambar." };
  }

  const path = `tte-${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
  const supabase = createServiceClient();
  const { error } = await supabase.storage
    .from("surat-ttd")
    .upload(path, file, { upsert: false, contentType: file.type });

  if (error) {
    console.error("[admin/surat] uploadTte failed:", error.message);
    return { ok: false, error: "Gagal mengunggah TTE." };
  }
  return { ok: true, path };
}

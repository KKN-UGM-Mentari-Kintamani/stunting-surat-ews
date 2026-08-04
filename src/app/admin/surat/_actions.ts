"use server";

/* src/app/admin/surat/_actions.ts
 * Admin Desa Phase 2 server actions: approval queue, approve (fires worker),
 * request revision, reject, walk-in create, Kades config.
 * Middleware + layout guard role=admin_desa; actions re-check as defense.
 */
import { revalidatePath } from "next/cache";

import { createClient, createServiceClient } from "@/lib/supabase/server";
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

  // Render the final PDF via react-pdf (in-process, serverless-friendly) and
  // upload it, then mark disetujui. Any failure clears processing_at so the
  // admin can retry (PRD §4.4 transactional integrity — nomor not consumed).
  const result = await renderAndApprove(permohonanId, supabase);
  if (!result.ok) {
    await supabase
      .from("permohonan_surat")
      .update({ processing_at: null })
      .eq("id", permohonanId);
  }
  revalidatePath("/admin/surat");
  return result;
}

/**
 * Renders the approved letter to PDF (react-pdf), uploads to the private
 * `surat-pdf` bucket, generates nomor + kode verifikasi, and marks the letter
 * as disetujui. Runs entirely on Vercel — no VPS / Puppeteer worker.
 */
async function renderAndApprove(
  permohonanId: string,
  supabase: Awaited<ReturnType<typeof createClient>>,
): Promise<ActionResult> {
  try {
    // 1. Load permohonan + jenis surat + snapshot.
    const { data: perm, error: permErr } = await supabase
      .from("permohonan_surat")
      .select("data_isian_snapshot, jenis_surat:master_jenis_surat(kode_klasifikasi, nama_surat)")
      .eq("id", permohonanId)
      .is("deleted_at", null)
      .maybeSingle();
    if (permErr || !perm) return { ok: false, error: "Permohonan tidak ditemukan." };

    const jenis = (perm.jenis_surat as unknown as
      | { kode_klasifikasi: string; nama_surat: string }[]
      | { kode_klasifikasi: string; nama_surat: string }
      | null) as { kode_klasifikasi: string; nama_surat: string } | { kode_klasifikasi: string; nama_surat: string }[] | null;
    const jenisObj = Array.isArray(jenis) ? jenis[0] : jenis;
    const kode = jenisObj?.kode_klasifikasi;
    const namaSurat = jenisObj?.nama_surat ?? "Surat Keterangan";
    if (!kode) return { ok: false, error: "Jenis surat tidak ditemukan." };

    // 2. Kades config (nama, NIP, jabatan, TTE path).
    const { data: config } = await supabase
      .from("surat_kades_config")
      .select("nama_kades,nip_kades,jabatan,ttd_cap_url")
      .eq("id", 1)
      .maybeSingle();

    // 3. TTE image from private bucket → base64 data-URI.
    let tteBase64: string | null = null;
    if (config?.ttd_cap_url) {
      const service = createServiceClient();
      const { data: tteBlob, error: tteErr } = await service.storage
        .from("surat-ttd")
        .download(config.ttd_cap_url);
      if (!tteErr && tteBlob) {
        const buf = Buffer.from(await tteBlob.arrayBuffer());
        tteBase64 = `data:image/png;base64,${buf.toString("base64")}`;
      } else {
        console.error("[admin/surat] TTE download failed:", tteErr?.message);
      }
    }

    // 4. Generate nomor + kode (counter upsert; race risk ≈ 0 at this scale).
    const tahun = new Date().getFullYear();
    const { data: counter } = await supabase
      .from("nomor_surat_counter")
      .select("nomor_urut")
      .eq("kode_klasifikasi", kode)
      .eq("tahun", tahun)
      .maybeSingle();
    const nextUrut = ((counter?.nomor_urut as number | undefined) ?? 0) + 1;
    const nomorSurat = formatNomorSurat(kode, nextUrut);
    const kodeVerifikasi = generateKodeVerifikasi();

    // 5. Render PDF (react-pdf).
    const { renderSuratPdf } = await import("@/lib/surat/pdf/surat-document");
    const pdfBuffer = await renderSuratPdf({
      namaSurat,
      snapshot: perm.data_isian_snapshot as never,
      nomorSurat,
      kodeVerifikasi,
      namaKades: config?.nama_kades ?? "Kepala Desa",
      nipKades: config?.nip_kades,
      jabatanKades: config?.jabatan,
      tteBase64,
    });

    // 6. Upload to private bucket.
    const pdfPath = `${tahun}/${kode}/${nomorSurat.replace(/\//g, "-")}.pdf`;
    const service = createServiceClient();
    const { error: upErr } = await service.storage
      .from("surat-pdf")
      .upload(pdfPath, pdfBuffer, {
        upsert: false,
        contentType: "application/pdf",
      });
    if (upErr) {
      console.error("[admin/surat] PDF upload failed:", upErr.message, upErr.statusCode ?? "");
      const msg = (upErr.message ?? "").toLowerCase();
      if (msg.includes("jwt") || msg.includes("jws") || msg.includes("unauthorized") || msg.includes("apikey")) {
        return { ok: false, error: "Gagal mengunggah PDF: kredensial server tidak valid. Periksa SUPABASE_SERVICE_ROLE_KEY." };
      }
      if (msg.includes("bucket") || msg.includes("not found") || msg.includes("resource")) {
        return { ok: false, error: "Gagal mengunggah PDF: bucket 'surat-pdf' belum ada. Buat di Supabase Storage." };
      }
      return { ok: false, error: `Gagal mengunggah PDF: ${upErr.message}` };
    }

    // 7. Update counter + mark disetujui (atomically as best-effort).
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
        pdf_final_url: pdfPath,
        disetujui_at: new Date().toISOString(),
        processing_at: null,
      })
      .eq("id", permohonanId);
    if (updErr) {
      console.error("[admin/surat] final update failed:", updErr.message);
      return { ok: false, error: `Gagal menyetujui: ${updErr.message}` };
    }
  } catch (err) {
    console.error("[admin/surat] renderAndApprove failed:", err);
    return { ok: false, error: "Gagal menerbitkan surat. Coba lagi." };
  }

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

/**
 * Unified action entry from the redesigned CRUD table. Dispatches to the
 * concrete action based on the selected verdict. Catatan is optional for
 * setuju, required for tolak. (Status "revisi" removed from the flow — a
 * reject with a comment tells the citizen what to fix; they submit anew.)
 */
export async function submitAksiAction(
  permohonanId: string,
  aksi: "setuju" | "tolak",
  catatan?: string,
): Promise<ActionResult> {
  if (aksi === "setuju") {
    return approveAction(permohonanId);
  }
  return rejectAction(permohonanId, catatan ?? "");
}

// ---------- Walk-in create ----------

/**
 * Walk-in: admin serves the citizen at the counter, so the letter is
 * AUTO-APPROVED immediately — inserted then rendered/approved via the same
 * pipeline as the online queue (nomor + kode + PDF + status=disetujui).
 */
export async function createWalkInAction(
  jenisSuratId: string,
  snapshot: IsianSnapshot,
): Promise<ActionResult<{ id: string; nomorSurat: string | null; pdfUrl: string | null }>> {
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

  // Auto-approve (walk-in = verified at the counter).
  const approved = await renderAndApprove(data.id, supabase);
  if (!approved.ok) {
    return { ok: false, error: approved.error };
  }

  revalidatePath("/admin/surat");
  return { ok: true, data: { id: data.id, nomorSurat: null, pdfUrl: null } };
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

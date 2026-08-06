"use server";

/* src/app/admin/surat/_actions.ts
 * Admin Desa Phase 2 server actions: approval queue, approve (fires worker),
 * request revision, reject, walk-in create, Kades config.
 * Middleware + layout guard role=admin_desa; actions re-check as defense.
 */
import { revalidatePath } from "next/cache";

import { createClient, createServiceClient } from "@/lib/supabase/server";
import { generateKodeVerifikasi, validateNomorSurat } from "@/lib/surat/nomor";
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
 * Approve: mark processing_at, then render + upload the final PDF and set
 * status=disetujui. The letter number is entered MANUALLY by the village
 * staff (no auto-increment counter). Returns immediately — PDF render is
 * synchronous in-process (react-pdf).
 */
export async function approveAction(
  permohonanId: string,
  nomorSurat: string,
  tujuanSktm?: string,
): Promise<ActionResult> {
  let adminId: string;
  try {
    adminId = await assertAdmin();
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Akses ditolak" };
  }
  const nomor = nomorSurat.trim();
  const validNomor = validateNomorSurat(nomor);
  if (validNomor) return { ok: false, error: validNomor };

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
  // admin can retry (PRD §4.4 transactional integrity).
  const result = await renderAndApprove(permohonanId, nomor, supabase, tujuanSktm);
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
 * Renders the approved letter to PDF (react-pdf) and uploads it to the private
 * `surat-pdf` bucket. Shared by the online approve pipeline and the walk-in
 * create flow so both produce identical documents. Returns the storage path +
 * auto-generated verification code, or an error (nothing persisted on failure).
 */
async function renderAndUploadPdf(
  supabase: Awaited<ReturnType<typeof createClient>>,
  args: {
    snapshot: IsianSnapshot;
    nomor: string;
    kode: string;
    namaSurat: string;
    templateKey: "sktm" | "sku" | "skp" | "skd" | "skl" | "skli" | "skm";
    tujuanSktm?: string;
  },
): Promise<{ ok: false; error: string } | { ok: true; pdfPath: string; kodeVerifikasi: string }> {
  try {
    // 1. Kades config (nama, NIP, jabatan, TTE & stempel path).
    const { data: config } = await supabase
      .from("surat_kades_config")
      .select("nama_kades,nip_kades,jabatan,ttd_cap_url,stempel_url")
      .eq("id", 1)
      .maybeSingle();

    // 2. TTE & stempel images from private bucket → base64 data-URIs.
    const service = createServiceClient();
    async function downloadAsBase64(path?: string | null): Promise<string | null> {
      if (!path) return null;
      const { data: blob, error: err } = await service.storage
        .from("surat-ttd")
        .download(path);
      if (err || !blob) {
        console.error("[admin/surat] asset download failed:", err?.message);
        return null;
      }
      const buf = Buffer.from(await blob.arrayBuffer());
      return `data:image/png;base64,${buf.toString("base64")}`;
    }
    const tteBase64 = await downloadAsBase64(config?.ttd_cap_url);
    const stempelBase64 = await downloadAsBase64(config?.stempel_url);

    // 3. Kode verifikasi is auto-generated; nomor came from the admin.
    const tahun = new Date().getFullYear();
    const nomor = args.nomor.trim();
    const kodeVerifikasi = generateKodeVerifikasi();

    // 4. Render PDF (react-pdf).
    const { renderSuratPdf } = await import("@/lib/surat/pdf/surat-document");
    const pdfBuffer = await renderSuratPdf({
      namaSurat: args.namaSurat,
      templateKey: args.templateKey,
      snapshot: args.snapshot as never,
      nomorSurat: nomor,
      kodeVerifikasi,
      namaKades: config?.nama_kades ?? "Perbekel Desa Songan B",
      nipKades: config?.nip_kades,
      jabatanKades: config?.jabatan,
      tteBase64,
      stempelBase64,
      tujuanSktm: args.tujuanSktm,
    });

    // 5. Upload to private bucket.
    const pdfPath = `${tahun}/${args.kode}/${nomor.replace(/\//g, "-")}.pdf`;
    const { error: upErr } = await service.storage
      .from("surat-pdf")
      .upload(pdfPath, pdfBuffer, {
        upsert: false,
        contentType: "application/pdf",
      });
    if (upErr) {
      console.error("[admin/surat] PDF upload failed:", upErr.message, upErr.statusCode ?? "");
      const msg = (upErr.message ?? "").toLowerCase();
      // Duplicate upload (same nomor → same path). Supabase says "already exists"
      // or returns 409; check BEFORE the bucket check because the bucket message
      // also contains "resource" ("The resource was not found").
      if (
        upErr.statusCode === "409" ||
        msg.includes("already exists") ||
        msg.includes("duplicate")
      ) {
        return { ok: false, error: "Nomor surat sudah dipakai. Gunakan nomor lain." };
      }
      if (msg.includes("jwt") || msg.includes("jws") || msg.includes("unauthorized") || msg.includes("apikey")) {
        return { ok: false, error: "Gagal mengunggah PDF: kredensial server tidak valid. Periksa SUPABASE_SERVICE_ROLE_KEY." };
      }
      if (msg.includes("bucket") || msg.includes("not found") || msg.includes("resource")) {
        return { ok: false, error: "Gagal mengunggah PDF: bucket 'surat-pdf' belum ada. Buat di Supabase Storage." };
      }
      return { ok: false, error: `Gagal mengunggah PDF: ${upErr.message}` };
    }

    return { ok: true, pdfPath, kodeVerifikasi };
  } catch (err) {
    console.error("[admin/surat] renderAndUploadPdf failed:", err);
    return { ok: false, error: "Gagal menerbitkan surat. Coba lagi." };
  }
}

/**
 * Renders the approved letter to PDF (react-pdf), uploads to the private
 * `surat-pdf` bucket, sets the manually-entered nomor + auto kode verifikasi,
 * and marks the letter as disetujui. Runs entirely on Vercel — no VPS.
 */
async function renderAndApprove(
  permohonanId: string,
  nomorSurat: string,
  supabase: Awaited<ReturnType<typeof createClient>>,
  tujuanSktm?: string,
): Promise<ActionResult> {
  try {
    // 1. Load permohonan + jenis surat + snapshot.
    const { data: perm, error: permErr } = await supabase
      .from("permohonan_surat")
      .select("data_isian_snapshot, jenis_surat:master_jenis_surat(kode_klasifikasi, nama_surat, template_key)")
      .eq("id", permohonanId)
      .is("deleted_at", null)
      .maybeSingle();
    if (permErr || !perm) return { ok: false, error: "Permohonan tidak ditemukan." };

    const jenis = (perm.jenis_surat as unknown as
      | { kode_klasifikasi: string; nama_surat: string; template_key: string }[]
      | { kode_klasifikasi: string; nama_surat: string; template_key: string }
      | null) as { kode_klasifikasi: string; nama_surat: string; template_key: string } | { kode_klasifikasi: string; nama_surat: string; template_key: string }[] | null;
    const jenisObj = Array.isArray(jenis) ? jenis[0] : jenis;
    const kode = jenisObj?.kode_klasifikasi;
    const namaSurat = jenisObj?.nama_surat ?? "Surat Keterangan";
    const templateKey = (jenisObj?.template_key ?? "sktm") as "sktm" | "sku" | "skp" | "skd" | "skl" | "skli" | "skm";
    if (!kode) return { ok: false, error: "Jenis surat tidak ditemukan." };

    // For SKTM the staff types the purpose phrase at approval (decision): merge
    // it into the frozen snapshot so the final document carries exactly what
    // the staff approved — consistent with the Snapshot Pattern.
    const snapshot = perm.data_isian_snapshot as unknown as IsianSnapshot;
    const snapshotFinal = tujuanSktm?.trim()
      ? {
          ...snapshot,
          data_khusus: { ...(snapshot.data_khusus ?? {}), tujuan_sktm: tujuanSktm.trim() },
        }
      : snapshot;

    const nomor = nomorSurat.trim();
    const rendered = await renderAndUploadPdf(supabase, {
      snapshot: snapshotFinal,
      nomor,
      kode,
      namaSurat,
      templateKey,
      tujuanSktm,
    });
    if (!rendered.ok) return rendered;

    // 2. Mark disetujui with the manually-entered nomor.
    const { error: updErr } = await supabase
      .from("permohonan_surat")
      .update({
        status: "disetujui",
        nomor_surat_final: nomor,
        kode_verifikasi: rendered.kodeVerifikasi,
        pdf_final_url: rendered.pdfPath,
        // Persist the approved purpose back into the snapshot (immutability of
        // the published letter, not of the original request).
        ...(snapshotFinal !== snapshot ? { data_isian_snapshot: snapshotFinal } : {}),
        disetujui_at: new Date().toISOString(),
        processing_at: null,
      })
      .eq("id", permohonanId);
    if (updErr) {
      console.error("[admin/surat] final update failed:", updErr.message);
      // Unique violation on nomor_surat_final → number already taken.
      if (updErr.code === "23505") {
        return { ok: false, error: "Nomor surat sudah dipakai. Gunakan nomor lain." };
      }
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
  nomorSurat?: string,
  tujuanSktm?: string,
): Promise<ActionResult> {
  if (aksi === "setuju") {
    return approveAction(permohonanId, nomorSurat ?? "", tujuanSktm);
  }
  return rejectAction(permohonanId, catatan ?? "");
}

// ---------- Walk-in create ----------

/**
 * Walk-in: admin serves the citizen at the counter, so the letter is
 * AUTO-APPROVED immediately. Unlike online requests (which start as 'menunggu'),
 * the walk-in row is inserted DIRECTLY as 'disetujui' AFTER the PDF renders &
 * uploads successfully — so a failed attempt never leaves an orphan 'menunggu'
 * row behind, and double-submits collide on the unique nomor at insert time.
 */
export async function createWalkInAction(
  jenisSuratId: string,
  snapshot: IsianSnapshot,
  nomorSurat: string,
): Promise<ActionResult<{ id: string; nomorSurat: string | null; pdfUrl: string | null }>> {
  let adminId: string;
  try {
    adminId = await assertAdmin();
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Akses ditolak" };
  }
  const nomor = nomorSurat.trim();
  const validNomor = validateNomorSurat(nomor);
  if (validNomor) return { ok: false, error: validNomor };

  const supabase = await createClient();

  // Resolve the letter type first (kode/nama/template) for the PDF render.
  const { data: jenis, error: jenisErr } = await supabase
    .from("master_jenis_surat")
    .select("kode_klasifikasi,nama_surat,template_key")
    .eq("id", jenisSuratId)
    .eq("is_active", true)
    .maybeSingle();
  if (jenisErr || !jenis) {
    return { ok: false, error: "Jenis surat tidak ditemukan." };
  }
  const jenisObj = jenis as unknown as
    | { kode_klasifikasi: string; nama_surat: string; template_key: string }
    | { kode_klasifikasi: string; nama_surat: string; template_key: string }[];
  const j = Array.isArray(jenisObj) ? jenisObj[0] : jenisObj;
  const kode = j?.kode_klasifikasi;
  const namaSurat = j?.nama_surat ?? "Surat Keterangan";
  const templateKey = (j?.template_key ?? "sktm") as "sktm" | "sku" | "skp" | "skd" | "skl" | "skli" | "skm";
  if (!kode) return { ok: false, error: "Jenis surat tidak ditemukan." };

  // Render + upload the PDF BEFORE touching permohonan_surat. On failure nothing
  // is persisted, so no orphaned 'menunggu' row can ever exist.
  const rendered = await renderAndUploadPdf(supabase, {
    snapshot,
    nomor,
    kode,
    namaSurat,
    templateKey,
  });
  if (!rendered.ok) return { ok: false, error: rendered.error };

  // Insert directly as 'disetujui'. A duplicate nomor → unique violation here
  // (no intermediate state), so double-submits produce exactly one row.
  const { data: row, error: insErr } = await supabase
    .from("permohonan_surat")
    .insert({
      user_id: null,
      admin_pembuat_id: adminId,
      admin_verifikator_id: adminId,
      jenis_surat_id: jenisSuratId,
      data_isian_snapshot: snapshot,
      status: "disetujui",
      nomor_surat_final: nomor,
      kode_verifikasi: rendered.kodeVerifikasi,
      pdf_final_url: rendered.pdfPath,
      disetujui_at: new Date().toISOString(),
    })
    .select("id")
    .single();
  if (insErr) {
    console.error("[admin/surat] createWalkIn failed:", insErr.message);
    if (insErr.code === "23505") {
      return { ok: false, error: "Nomor surat sudah dipakai. Gunakan nomor lain." };
    }
    return { ok: false, error: "Gagal membuat surat walk-in." };
  }

  revalidatePath("/admin/surat");
  return { ok: true, data: { id: row.id, nomorSurat: nomor, pdfUrl: null } };
}

// ---------- Kades config ----------

export interface KadesConfig {
  nama_kades: string;
  nip_kades: string | null;
  jabatan: string | null;
  ttd_cap_url: string | null;
  stempel_url: string | null;
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
    .select("nama_kades,nip_kades,jabatan,ttd_cap_url,stempel_url")
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
  stempelUrl?: string;
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
      stempel_url: input.stempelUrl?.trim() || null,
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

// ---------- TTE / stempel upload ----------

/**
 * Upload Kades signature (tte) or stamp (stempel) to the PRIVATE 'surat-ttd'
 * bucket. Returns the storage path (stored in surat_kades_config.ttd_cap_url /
 * stempel_url). Compression is done client-side (browser-image-compression).
 */
export async function uploadAsetTtdAction(
  jenis: "tte" | "stempel",
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
  // Cap upload size server-side (client compresses, but never trust the client).
  if (file.size > 2 * 1024 * 1024) {
    return { ok: false, error: "Ukuran gambar maksimal 2MB." };
  }

  const prefix = jenis === "stempel" ? "stempel-" : "tte-";
  const path = `${prefix}${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
  const supabase = createServiceClient();
  const { error } = await supabase.storage
    .from("surat-ttd")
    .upload(path, file, { upsert: false, contentType: file.type });

  if (error) {
    console.error(`[admin/surat] uploadAsetTtd(${jenis}) failed:`, error.message);
    return { ok: false, error: "Gagal mengunggah gambar." };
  }
  return { ok: true, path };
}

/** Backward-compatible alias for the existing UI import. */
export async function uploadTteAction(
  formData: FormData,
): Promise<{ ok: false; error: string } | { ok: true; path: string }> {
  return uploadAsetTtdAction("tte", formData);
}

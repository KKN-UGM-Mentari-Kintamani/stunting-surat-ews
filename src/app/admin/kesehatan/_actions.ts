"use server";

/* src/app/admin/kesehatan/_actions.ts
 * Server actions for the cadre CMS. Only kader_kesehatan may call these
 * (enforced by middleware + the layout guard). Thumbnail upload uses the
 * regular server client (user session + RLS).
 */
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { AGE_BUCKET_LABEL } from "@/lib/calc/lms";

export type ActionResult =
  | { ok: true; id?: string }
  | { ok: false; error: string };

function toSlug(title: string): string {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

async function ensureUniqueSlug(slug: string, excludeId?: string): Promise<string> {
  const supabase = await createClient();
  let candidate = slug;
  let suffix = 2;
  while (true) {
    const query = supabase
      .from("edukasi")
      .select("id")
      .eq("slug", candidate);
    if (excludeId) query.neq("id", excludeId);
    const { data } = await query.maybeSingle();
    if (!data) return candidate;
    candidate = `${slug}-${suffix}`;
    suffix++;
  }
}

export async function createArticleAction(form: FormData): Promise<ActionResult> {
  const raw = Object.fromEntries(form.entries());
  const judul = String(raw.judul ?? "").trim();
  if (judul.length < 3) return { ok: false, error: "Judul minimal 3 karakter." };

  let slug = String(raw.slug ?? "").trim();
  if (!slug) slug = toSlug(judul);
  if (!slug) return { ok: false, error: "Slug tidak boleh kosong." };

  const tipe = String(raw.tipe_konten ?? "");
  const kategori = String(raw.kategori_umur ?? "");
  if (!["artikel_gizi", "resep_mpasi"].includes(tipe)) {
    return { ok: false, error: "Jenis konten tidak valid." };
  }
  if (!(kategori in AGE_BUCKET_LABEL)) {
    return { ok: false, error: "Kategori usia tidak valid." };
  }

  slug = await ensureUniqueSlug(slug);

  const supabase = await createClient();
  const { data: me } = await supabase.auth.getUser();
  const { error } = await supabase.from("edukasi").insert({
    judul,
    slug,
    tipe_konten: tipe,
    kategori_umur: kategori,
    konten_html: String(raw.konten_html ?? ""),
    thumbnail_url: String(raw.thumbnail_url ?? "").trim() || null,
    author_id: me.user?.id,
    published: false,
  });

  if (error) {
    console.error("[actions] createArticle failed:", error.message);
    return { ok: false, error: "Gagal membuat artikel. Coba lagi." };
  }
  revalidatePath("/admin/kesehatan");
  redirect("/admin/kesehatan");
}

export async function updateArticleAction(
  id: string,
  form: FormData,
): Promise<ActionResult> {
  const raw = Object.fromEntries(form.entries());
  const judul = String(raw.judul ?? "").trim();
  if (judul.length < 3) return { ok: false, error: "Judul minimal 3 karakter." };

  let slug = String(raw.slug ?? "").trim();
  if (!slug) slug = toSlug(judul);
  if (!slug) return { ok: false, error: "Slug tidak boleh kosong." };

  const tipe = String(raw.tipe_konten ?? "");
  const kategori = String(raw.kategori_umur ?? "");
  if (!["artikel_gizi", "resep_mpasi"].includes(tipe)) {
    return { ok: false, error: "Jenis konten tidak valid." };
  }
  if (!(kategori in AGE_BUCKET_LABEL)) {
    return { ok: false, error: "Kategori usia tidak valid." };
  }

  slug = await ensureUniqueSlug(slug, id);

  const supabase = await createClient();
  const { error } = await supabase.from("edukasi").update({
    judul,
    slug,
    tipe_konten: tipe,
    kategori_umur: kategori,
    konten_html: String(raw.konten_html ?? ""),
    thumbnail_url: String(raw.thumbnail_url ?? "").trim() || null,
    published: raw.published === "true",
  }).eq("id", id);

  if (error) {
    console.error("[actions] updateArticle failed:", error.message);
    return { ok: false, error: "Gagal memperbarui artikel." };
  }
  revalidatePath("/admin/kesehatan");
  redirect("/admin/kesehatan");
}

export async function deleteArticleAction(id: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("edukasi")
    .delete()
    .eq("id", id);
  if (error) {
    console.error("[actions] deleteArticle failed:", error.message);
    return { ok: false, error: "Gagal menghapus artikel." };
  }
  revalidatePath("/admin/kesehatan");
  return { ok: true };
}

export async function publishArticleAction(
  id: string,
  published: boolean,
): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("edukasi")
    .update({ published })
    .eq("id", id);
  if (error) {
    console.error("[actions] publishArticle failed:", error.message);
    return { ok: false, error: "Gagal mengubah status publikasi." };
  }
  revalidatePath("/admin/kesehatan");
  revalidatePath("/edukasi");
  return { ok: true };
}

/**
 * Upload a single image to the Supabase 'thumbnails' bucket.
 * Uses the regular server client (user session + RLS). Requires:
 *
 *   1. Bucket exists: Supabase Dashboard → Storage → New Bucket →
 *      name 'thumbnails', ☑ Public bucket.
 *   2. RLS policy on storage.objects:
 *
 *      CREATE POLICY "cadre can upload thumbnails"
 *      ON storage.objects FOR INSERT TO authenticated
 *      WITH CHECK (
 *        bucket_id = 'thumbnails'
 *        AND EXISTS (SELECT 1 FROM public.users u
 *                    WHERE u.id = auth.uid()
 *                      AND u.role = 'kader_kesehatan'
 *                      AND u.deleted_at IS NULL)
 *      );
 */
export async function uploadThumbnailAction(
  formData: FormData,
): Promise<{ ok: false; error: string } | { ok: true; url: string }> {
  const file = formData.get("file") as File | null;
  if (!file || !(file instanceof File)) {
    return { ok: false, error: "File tidak ditemukan." };
  }
  if (!file.type.startsWith("image/")) {
    return { ok: false, error: "File harus berupa gambar." };
  }

  const bucket = "thumbnails";
  const supabase = await createClient();
  const path = `cadre-uploads/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;

  const { error } = await supabase.storage
    .from(bucket)
    .upload(path, file, { upsert: false, contentType: file.type });

  if (error) {
    console.error("[actions] uploadThumbnail failed:", error.message);
    const msg = error.message?.toLowerCase() ?? "";
    if (msg.includes("bucket") || msg.includes("not found") || msg.includes("row")) {
      return {
        ok: false,
        error:
          "Bucket 'thumbnails' belum dibuat. Buka Supabase Dashboard → " +
          "Storage → New Bucket → nama 'thumbnails', centang Public bucket.",
      };
    }
    if (msg.includes("jws") || msg.includes("token") || msg.includes("auth")) {
      return {
        ok: false,
        error:
          "Sesi tidak valid. Coba logout lalu login ulang, atau " +
          "periksa kredensial Supabase di .env.local.",
      };
    }
    return { ok: false, error: `Gagal mengunggah: ${error.message}` };
  }

  const { data: publicUrlData } = supabase.storage
    .from(bucket)
    .getPublicUrl(path);

  return { ok: true, url: publicUrlData.publicUrl };
}
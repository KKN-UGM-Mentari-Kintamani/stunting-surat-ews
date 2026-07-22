import { notFound } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { ArticleForm } from "@/app/admin/kesehatan/_components/article-form";

export const metadata = { title: "Edit Artikel" };

export default async function EditArticlePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("edukasi")
    .select(
      "id, judul, slug, tipe_konten, kategori_umur, konten_html, thumbnail_url, published",
    )
    .eq("id", id)
    .maybeSingle();
  if (error || !data) notFound();

  const article = data as unknown as {
    id: string;
    judul: string;
    slug: string;
    tipe_konten: "artikel_gizi" | "resep_mpasi";
    kategori_umur: string;
    konten_html: string;
    thumbnail_url: string;
    published: boolean;
  };

  return (
    <div className="flex flex-col gap-6 py-10 md:py-14">
      <div>
        <h1 className="font-display text-[28px] leading-[1.15] font-semibold md:text-[40px] md:leading-[1.1]">
          Edit Artikel
        </h1>
        <p className="mt-2 text-[15px] text-muted-foreground">
          &quot;{article.judul}&quot;{article.published ? " · Telah Terbit" : " · Draft"}
        </p>
      </div>

      <ArticleForm
        mode="edit"
        defaultValues={{
          id: article.id,
          judul: article.judul,
          slug: article.slug,
          tipe_konten: article.tipe_konten,
          kategori_umur: article.kategori_umur,
          konten_html: article.konten_html ?? "",
          thumbnail_url: article.thumbnail_url ?? "",
          published: article.published,
        }}
      />
    </div>
  );
}
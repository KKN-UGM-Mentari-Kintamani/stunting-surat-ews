import { notFound } from "next/navigation";
import Link from "next/link";
import { BookOpenText, CookingPot } from "lucide-react";

import { AGE_BUCKET_LABEL, type AgeBucket } from "@/lib/calc/lms";
import { Badge } from "@/components/ui/badge";

interface DetailArticle {
  judul: string;
  slug: string;
  tipe_konten: "artikel_gizi" | "resep_mpasi";
  kategori_umur: string;
  konten_html: string;
  thumbnail_url: string | null;
  created_at: string;
  author?: { nama_lengkap: string } | null;
}

interface Props {
  article: DetailArticle;
}

const typeMeta = {
  artikel_gizi: {
    label: "Artikel Gizi",
    parent: "Artikel Gizi",
    Icon: BookOpenText,
  },
  resep_mpasi: {
    label: "Resep MPASI",
    parent: "Resep MPASI",
    Icon: CookingPot,
  },
} as const;

export function ArticleDetailView({ article }: Props) {
  const meta = typeMeta[article.tipe_konten];

  return (
    <article className="mx-auto flex w-full max-w-[800px] flex-col gap-8 px-5 py-10 md:px-8 md:py-14">
      {/* Breadcrumb */}
      <nav aria-label="Breadcrumb" className="text-[13px] text-muted-foreground">
        <ol className="flex flex-wrap items-center gap-1">
          <li>
            <Link href="/" className="hover:text-foreground">
              Beranda
            </Link>
          </li>
          <span aria-hidden>/</span>
          <li>
            <Link href="/edukasi" className="hover:text-foreground">
              Edukasi
            </Link>
          </li>
          <span aria-hidden>/</span>
          <li>
            <Link
              href={`/edukasi/${article.tipe_konten === "resep_mpasi" ? "resep-mpasi" : "artikel-gizi"}`}
              className="hover:text-foreground"
            >
              {meta.parent}
            </Link>
          </li>
          <span aria-hidden>/</span>
          <li className="truncate text-foreground font-medium">
            {article.judul}
          </li>
        </ol>
      </nav>

      {/* Header */}
      <header className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="secondary" className="gap-1">
            <meta.Icon className="size-3" strokeWidth={1.5} aria-hidden />
            {meta.label}
          </Badge>
          <Badge variant="outline" className="text-[13px]">
            {AGE_BUCKET_LABEL[article.kategori_umur as AgeBucket] ??
              article.kategori_umur}
          </Badge>
        </div>
        <h1 className="font-display text-[28px] leading-[1.15] font-semibold md:text-[40px] md:leading-[1.1]">
          {article.judul}
        </h1>
        <p className="text-[15px] text-muted-foreground">
          {article.author?.nama_lengkap ? (
            <>
              Ditulis oleh {article.author.nama_lengkap} ·{" "}
            </>
          ) : null}
          {new Date(article.created_at).toLocaleDateString("id-ID", {
            day: "numeric",
            month: "long",
            year: "numeric",
          })}
        </p>
      </header>

      {/* Thumbnail */}
      {article.thumbnail_url && (
        <img
          src={article.thumbnail_url}
          alt=""
          className="w-full rounded-md object-cover"
          style={{ maxHeight: 400 }}
          loading="lazy"
        />
      )}

      {/* Content — TipTap output is safe HTML; styled via the prose wrapper. */}
      <div
        className="konten-artikel flex flex-col gap-4 text-[16px] leading-[1.7] text-foreground [&_h2]:font-display [&_h2]:text-[22px] [&_h2]:font-medium [&_h2]:leading-[1.25] [&_h3]:font-semibold [&_h3]:text-[18px] [&_h3]:leading-[1.3] [&_p]:leading-[1.7] [&_ul]:list-disc [&_ul]:pl-6 [&_ol]:list-decimal [&_ol]:pl-6 [&_li]:mb-1 [&_li]:leading-[1.6] [&_blockquote]:border-l-[3px] [&_blockquote]:border-primary/30 [&_blockquote]:pl-4 [&_blockquote]:italic [&_blockquote]:text-muted-foreground [&_hr]:my-6 [&_hr]:border-border [&_a]:font-medium [&_a]:text-secondary [&_a]:underline [&_a]:underline-offset-4"
        dangerouslySetInnerHTML={{ __html: article.konten_html }}
      />

      {/* Back to directory */}
      <footer className="border-t border-border pt-6">
        <Link
          href="/edukasi"
          className="text-[15px] font-medium text-secondary underline-offset-4 hover:underline"
        >
          ← Kembali ke direktori
        </Link>
      </footer>
    </article>
  );
}

/**
 * Standard slug-to-detail-page helper used by both /artikel-gizi/[slug]
 * and /resep-mpasi/[slug]. Returns the article or calls notFound().
 */
export async function fetchDetailArticle(
  slug: string,
  tipeKonten: "artikel_gizi" | "resep_mpasi",
): Promise<DetailArticle> {
  const { createClient } = await import("@/lib/supabase/server");
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("edukasi")
    .select(
      "judul, slug, tipe_konten, kategori_umur, konten_html, thumbnail_url, created_at, author:users(nama_lengkap)",
    )
    .eq("slug", slug)
    .eq("tipe_konten", tipeKonten)
    .eq("published", true)
    .maybeSingle();
  if (error || !data) notFound();
  return data as unknown as DetailArticle;
}
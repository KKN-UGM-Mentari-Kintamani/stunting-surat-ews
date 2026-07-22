import type { Metadata } from "next";

import {
  ArticleDetailView,
  fetchDetailArticle,
} from "@/app/edukasi/_components/article-detail";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const article = await fetchDetailArticle(slug, "artikel_gizi").catch(
    () => null,
  );
  if (!article) return { title: "Artikel tidak ditemukan" };
  return {
    title: article.judul,
    description:
      article.konten_html?.replace(/<[^>]*>/g, "").slice(0, 160) ?? "",
    openGraph: {
      title: article.judul,
      type: "article",
      images: article.thumbnail_url ? [article.thumbnail_url] : undefined,
    },
  };
}

export default async function ArtikelGiziDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const article = await fetchDetailArticle(slug, "artikel_gizi");

  const ld = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: article.judul,
    datePublished: article.created_at,
    author: article.author
      ? { "@type": "Person", name: article.author.nama_lengkap }
      : undefined,
    ...(article.thumbnail_url
      ? { image: article.thumbnail_url }
      : {}),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(ld) }}
      />
      <ArticleDetailView article={article} />
    </>
  );
}
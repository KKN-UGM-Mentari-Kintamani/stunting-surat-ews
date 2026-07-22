"use client";

/* src/app/edukasi/_components/education-grid.tsx
 * Client-side filter + grid. All articles are shipped once from the server;
 * filtering is pure state — zero network round-trips on low-end rural links
 * (AGENTS.md empathy).
 */
import { useState } from "react";

import type { ArticleCardData } from "@/app/edukasi/page";
import { ArticleCard } from "@/app/edukasi/_components/article-card";
import { DirectoryFilters } from "@/app/edukasi/_components/directory-filters";
import { Empty, EmptyDescription, EmptyTitle } from "@/components/ui/empty";

export function EducationGrid({
  articles,
}: {
  articles: ArticleCardData[];
}) {
  const [age, setAge] = useState<string | null>(null);
  const [type, setType] = useState<string | null>(null);

  const filtered = articles.filter((a) => {
    if (age && a.kategori_umur !== age) return false;
    if (type && a.tipe_konten !== type) return false;
    return true;
  });

  return (
    <div className="flex flex-col gap-6">
      <DirectoryFilters
        selectedAge={age}
        onAgeChange={setAge}
        selectedType={type}
        onTypeChange={setType}
      />

      {filtered.length === 0 ? (
        <div className="flex justify-center py-12">
          <Empty className="max-w-md text-center">
            <EmptyTitle>Belum ada konten</EmptyTitle>
            <EmptyDescription>
              {articles.length === 0
                ? "Artikel dan resep akan muncul di sini setelah diterbitkan oleh kader Posyandu."
                : "Tidak ada konten yang cocok dengan filter ini. Coba ubah atau hapus filter."}
            </EmptyDescription>
          </Empty>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-5 @2xl:grid-cols-2 @4xl:grid-cols-3 @6xl:grid-cols-4">
          {filtered.map((a) => (
            <ArticleCard key={a.id} article={a} />
          ))}
        </div>
      )}
    </div>
  );
}
/* src/app/edukasi/page.tsx
 * Public education directory (PRD §4.2B) — combined grid of nutrition
 * articles & MPASI recipes, tagged by age category (5 buckets) and content
 * type. Client-side filtering runs after the server has shipped all published
 * data in a single payload (no extra network round-trips on rural links).
 */
import { createClient } from "@/lib/supabase/server";
import { EducationGrid } from "@/app/edukasi/_components/education-grid";
import { Skeleton } from "@/components/ui/skeleton";
import { Suspense } from "react";

export const metadata = {
  title: "Edukasi & MPASI",
  description:
    "Artikel gizi dan resep MPASI untuk balita 0–60 bulan. Filter berdasarkan usia dan jenis konten.",
};

export default async function EdukasiPage() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("edukasi")
    .select(
      "id, judul, slug, tipe_konten, kategori_umur, thumbnail_url, created_at",
    )
    .eq("published", true)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[edukasi] fetch failed:", error.message);
  }
  const articles = (data ?? []) as ArticleCardData[];

  return (
    <div className="mx-auto flex w-full max-w-[1120px] flex-col gap-8 px-5 py-10 md:px-8 md:py-14">
      <section>
        <p className="mb-3 text-[13px] font-medium tracking-[0.06em] text-primary uppercase">
          Pusat Informasi
        </p>
        <h1 className="font-display text-[28px] leading-[1.15] font-semibold md:text-[40px] md:leading-[1.1]">
          Edukasi Gizi & Resep MPASI
        </h1>
        <p className="mt-3 max-w-xl text-[16px] leading-[1.6] text-muted-foreground">
          Temukan artikel gizi dan resep MPASI berdasarkan usia si kecil.
          Filter di bawah untuk melihat konten yang paling relevan.
        </p>
      </section>

      <Suspense
        fallback={
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-48 w-full rounded-md" />
            ))}
          </div>
        }
      >
        <EducationGrid articles={articles} />
      </Suspense>
    </div>
  );
}

export interface ArticleCardData {
  id: string;
  judul: string;
  slug: string;
  tipe_konten: "artikel_gizi" | "resep_mpasi";
  kategori_umur: string;
  thumbnail_url: string | null;
  created_at: string;
}
/* src/app/sitemap.ts
 * Automatic sitemap.xml (PRD §7 SEO). Static public pages + all published
 * education articles & MPASI recipes, each with its type-scoped URL.
 * Runs at build time; uses the anonymous Supabase client (RLS allows public
 * SELECT on published=true content).
 */
import type { MetadataRoute } from "next";

import { createClient } from "@/lib/supabase/server";
import { siteUrl } from "@/lib/site-url";

interface EdukasiSlug {
  slug: string;
  tipe_konten: "artikel_gizi" | "resep_mpasi";
  updated_at: string;
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = siteUrl();

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("edukasi")
    .select("slug, tipe_konten, updated_at")
    .eq("published", true);

  let edukasi: EdukasiSlug[] = [];
  if (error) {
    console.error("[sitemap] fetch failed:", error.message);
  } else {
    edukasi = (data ?? []) as unknown as EdukasiSlug[];
  }

  return [
    {
      url: `${base}/`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: `${base}/edukasi`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.9,
    },
    {
      url: `${base}/login`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.3,
    },
    ...edukasi.map((e) => ({
      url: `${base}/edukasi/${e.tipe_konten === "resep_mpasi" ? "resep-mpasi" : "artikel-gizi"}/${e.slug}`,
      lastModified: new Date(e.updated_at),
      changeFrequency: "monthly" as const,
      priority: 0.8,
    })),
  ];
}

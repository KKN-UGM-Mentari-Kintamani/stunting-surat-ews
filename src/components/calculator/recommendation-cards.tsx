/* src/components/calculator/recommendation-cards.tsx
 * Contextual recommendations (PRD §4.2A / §4.2B), split into two tracks that
 * follow the child's age bucket:
 *   - Artikel Gizi   (general nutrition articles)
 *   - Resep MPASI    (complementary feeding recipes)
 *
 * When CMS data exists, renders ArticleCard-style cards with thumbnail
 * placeholder + title, linking directly to the article. Falls back to plain
 * cards with descriptive text when the CMS is empty. Shows whatever count
 * is available (1–3 per type) — never pads to a fixed number.
 */
import Link from "next/link";
import { ArrowRight, BookOpenText, CookingPot } from "lucide-react";

import {
  AGE_BUCKET_LABEL,
  ageBucketOf,
  type AgeBucket,
} from "@/lib/calc/lms";
import type { ArticleCardData } from "@/app/edukasi/page";
import { ArticleCard } from "@/app/edukasi/_components/article-card";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

interface FallbackItem {
  title: string;
  body: string;
}

const FALLBACK_ARTICLES: Record<AgeBucket, FallbackItem[]> = {
  "0-6": [
    { title: "ASI eksklusif 6 bulan pertama", body: "Mengapa ASI cukup tanpa makanan tambahan hingga usia 6 bulan." },
    { title: "Tanda bayi cukup minum ASI", body: "Cara membaca tanda kekenyangan & berat badan naik normal." },
    { title: "Bersiap menuju MPASI", body: "Kapan & bagaimana mengenalkan makanan pendamping ASI." },
  ],
  "6-8": [
    { title: "Tekstur halus pertama", body: "Perkenalkan puree tunggal — pisang, alpukat, nasi saring." },
    { title: "Jadwal MPASI 6–8 bulan", body: "Frekuensi pemberian & porsi yang sesuai usia ini." },
    { title: "Hindari gula & garam berlebih", body: "Mengapa MPASI bayi sebaiknya tanpa tambahan gula-garam." },
  ],
  "9-11": [
    { title: "Tekstur saring kasar", body: "Transisi dari puree halus ke makanan yang bisa diunyah lembut." },
    { title: "Protein hewani untuk si kecil", body: "Telur, ikan, ayam — porsi & tekstur yang aman." },
    { title: "Camilan bergizi tengah hari", body: "Buah & camilan rumah yang padat gizi." },
  ],
  "12-24": [
    { title: "Transisi makanan keluarga", body: "Bagaimana si kecil mulai makan menu yang sama dengan keluarga." },
    { title: "Porsi seimbang harian", body: "Komposisi karbo, protein, sayur, dan buah per hari." },
    { title: "Menumbuhkan kebiasaan makan mandiri", body: "Mendorong si kecil makan sendiri tanpa paksaan." },
  ],
  "24-60": [
    { title: "Pola makan balita sehat", body: "Variasi piring yang seimbang untuk usia prasekolah." },
    { title: "Camilan cerdas", body: "Mengganti jajanan dengan camilan bergizi dari rumah." },
    { title: "Aktivitas & nafsu makan", body: "Hubungan bermain aktif dengan nafsu makan yang baik." },
  ],
};

const FALLBACK_MPASI: Record<AgeBucket, FallbackItem[]> = {
  "0-6": [
    { title: "Hanya ASI", body: "Belum ada resep MPASI pada rentang usia ini — ASI saja sudah cukup." },
    { title: "Menyiapkan kesiapan MPASI", body: "Perbekal diri dengan resep-resep yang akan diperkenalkan di usia 6 bulan." },
  ],
  "6-8": [
    { title: "Puree pisang", body: "Tekstur halus untuk MPASI pertama; tinggal lumatkan pisang matang." },
    { title: "Bubur nasi saring", body: "Bubur saring dengan sedikit ASI/formula, tanpa garam." },
    { title: "Puree alpukat", body: "Lemak sehat untuk tumbuh kembang, tekstur lembut untuk awal MPASI." },
  ],
  "9-11": [
    { title: "Bubur tim ayam jagung", body: "Protein hewani dan karbo kompleks, tekstur saring kasar." },
    { title: "Puree ikan kuning labu", body: "Kombinasi protein & betakaroten untuk variasi rasa." },
    { title: "Tim bayam telur", body: "Zat besi & protein dalam satu suapan lembut." },
  ],
  "12-24": [
    { title: "Nasi tim lengkap", body: "Karbo, protein, sayur dalam porsi kecil siap makan keluarga." },
    { title: "Bakso tahu sayur", body: "Tekstur kenyal lembut dan serat sayur dari rumah." },
    { title: "Sup kental tempe jagung", body: "Protein nabati murah dan mengenyangkan." },
  ],
  "24-60": [
    { title: "Piring lengkap prasekolah", body: "Satu porsi seimbang yang bisa disesuaikan menu keluarga." },
    { title: "Camilan buah & yogurt", body: "Camilan padat gizi sebagai pengganti jajanan pabrikan." },
    { title: "Pancake pisang oat", body: "Sarapan risiko gula rendah, serat tinggi." },
  ],
};

interface Props {
  ageMonths: number;
  edukasiRecs: Record<string, { artikel_gizi: ArticleCardData[]; resep_mpasi: ArticleCardData[] }>;
}

function LiveGrid({ items }: { items: ArticleCardData[] }) {
  if (items.length === 0) return null;
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
      {items.map((a) => (
        <ArticleCard key={a.id} article={a} />
      ))}
    </div>
  );
}

function FallbackGrid({ items }: { items: FallbackItem[] }) {
  if (items.length === 0) return <p className="text-[15px] text-muted-foreground py-4">Belum ada konten tersedia.</p>;
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
      {items.map((item) => (
        <Card key={item.title} size="sm">
          <CardHeader>
            <CardTitle className="text-[16px] leading-snug">{item.title}</CardTitle>
          </CardHeader>
          <CardContent>
            <CardDescription className="text-[15px] leading-relaxed">{item.body}</CardDescription>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export function RecommendationCards({ ageMonths, edukasiRecs }: Props) {
  const bucket = ageBucketOf(ageMonths);
  const liveArticles = edukasiRecs[bucket]?.artikel_gizi ?? [];
  const liveMpasi = edukasiRecs[bucket]?.resep_mpasi ?? [];
  const hasLiveContent = liveArticles.length > 0 || liveMpasi.length > 0;

  return (
    <section className="flex flex-col gap-6 mt-10">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h2 className="font-display text-[22px] leading-[1.25] font-medium">
            Rekomendasi untuk usia ini
          </h2>
          <p className="mt-1 text-[15px] text-muted-foreground">
            {AGE_BUCKET_LABEL[bucket]}
          </p>
        </div>
        <Link
          href="/edukasi"
          className="shrink-0 text-[15px] font-medium text-secondary underline-offset-4 hover:underline"
        >
          Lihat semua resep &amp; artikel
          <ArrowRight className="ml-1 inline size-4" aria-hidden />
        </Link>
      </div>

      {hasLiveContent ? (
        <>
          {liveArticles.length > 0 && (
            <div className="flex flex-col gap-4">
              <h3 className="flex items-center gap-2 text-[16px] font-semibold leading-snug">
                <BookOpenText className="size-5 text-primary" strokeWidth={1.5} aria-hidden />
                Artikel Gizi
              </h3>
              <LiveGrid items={liveArticles} />
            </div>
          )}
          {liveMpasi.length > 0 && (
            <div className="flex flex-col gap-4">
              <h3 className="flex items-center gap-2 text-[16px] font-semibold leading-snug">
                <CookingPot className="size-5 text-primary" strokeWidth={1.5} aria-hidden />
                Resep MPASI
              </h3>
              <LiveGrid items={liveMpasi} />
            </div>
          )}
        </>
      ) : (
        <>
          <div className="flex flex-col gap-4">
            <h3 className="flex items-center gap-2 text-[16px] font-semibold leading-snug">
              <BookOpenText className="size-5 text-primary" strokeWidth={1.5} aria-hidden />
              Artikel Gizi
            </h3>
            <FallbackGrid items={FALLBACK_ARTICLES[bucket]} />
          </div>
          <div className="flex flex-col gap-4">
            <h3 className="flex items-center gap-2 text-[16px] font-semibold leading-snug">
              <CookingPot className="size-5 text-primary" strokeWidth={1.5} aria-hidden />
              Resep MPASI
            </h3>
            <FallbackGrid items={FALLBACK_MPASI[bucket]} />
          </div>
        </>
      )}
    </section>
  );
}
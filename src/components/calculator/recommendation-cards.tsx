/* src/components/calculator/recommendation-cards.tsx
 * 3 contextual MPASI/nutrition cards filtered to the child's age bucket
 * (PRD §4.2B). Until the /edukasi CMS exists (later stage), these are static
 * placeholder cards that link to /edukasi — preserves the home page's PRD
 * structure so swapping in live data later is a data-only change.
 */
import Link from "next/link";
import { ArrowRight } from "lucide-react";

import {
  AGE_BUCKET_LABEL,
  ageBucketOf,
  type AgeBucket,
} from "@/lib/calc/lms";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

interface PlaceholderArticle {
  title: string;
  body: string;
}

const SAMPLE: Record<AgeBucket, PlaceholderArticle[]> = {
  "0-6": [
    {
      title: "ASI eksklusif 6 bulan pertama",
      body: "Mengapa ASI cukup tanpa makanan tambahan hingga usia 6 bulan.",
    },
    {
      title: "Tanda bayi cukup minum ASI",
      body: "Cara membaca tanda kekenyangan & berat badan naik normal.",
    },
    {
      title: "Bersiap menuju MPASI",
      body: "Kapan & bagaimana mengenalkan makanan pendamping ASI.",
    },
  ],
  "6-8": [
    {
      title: "Tekstur halus pertama",
      body: "MPASI awal berupa puree tunggal — nasi saring, pisang, alpukat.",
    },
    {
      title: "Jadwal MPASI 6–8 bulan",
      body: "Frekuensi pemberian & porsi yang sesuai usia ini.",
    },
    {
      title: "Hindari gula & garam berlebih",
      body: "Mengapa MPASI bayi sebaiknya tanpa tambahan gula-garam.",
    },
  ],
  "9-11": [
    {
      title: "Tekstur saring kasar",
      body: "Transisi dari puree halus ke makanan yang bisa diunyah lembut.",
    },
    {
      title: "Protein hewani untuk si kecil",
      body: "Telur, ikan, ayam — porsi & tekstur yang aman.",
    },
    {
      title: "Camilan bergizi tengah hari",
      body: "Buah & camilan rumah yang padat gizi.",
    },
  ],
  "12-24": [
    {
      title: "Transisi makanan keluarga",
      body: "Bagaimana si kecil mulai makan menu yang sama dengan keluarga.",
    },
    {
      title: "Porsi seimbang harian",
      body: "Komposisi karbo, protein, sayur, dan buah per hari.",
    },
    {
      title: "Menumbuhkan kebiasaan makan mandiri",
      body: "Mendorong si kecil makan sendiri tanpa paksaan.",
    },
  ],
  "24-60": [
    {
      title: "Pola makan balita sehat",
      body: "Variasi piring yang seimbang untuk usia prasekolah.",
    },
    {
      title: "Camilan cerdas",
      body: "Mengganti jajanan dengan camilan bergizi dari rumah.",
    },
    {
      title: "Aktivitas & nafsu makan",
      body: "Hubungan bermain aktif dengan nafsu makan yang baik.",
    },
  ],
};

export function RecommendationCards({ ageMonths }: { ageMonths: number }) {
  const bucket = ageBucketOf(ageMonths);
  const items = SAMPLE[bucket];

  return (
    <section className="flex flex-col gap-4">
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
          className="hidden shrink-0 text-[15px] font-medium text-secondary underline-offset-4 hover:underline @sm:inline"
        >
          Lihat semua <ArrowRight className="inline size-4" aria-hidden />
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-4 @md/field-group:grid-cols-3">
        {items.map((item) => (
          <Card key={item.title} size="sm">
            <CardHeader>
              <CardTitle className="text-[16px] leading-snug">
                {item.title}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription className="text-[15px] leading-relaxed">
                {item.body}
              </CardDescription>
            </CardContent>
          </Card>
        ))}
      </div>

      <Link
        href="/edukasi"
        className="mt-1 text-[15px] font-medium text-secondary underline-offset-4 hover:underline @sm:hidden"
      >
        Lihat semua resep &amp; artikel
      </Link>
    </section>
  );
}
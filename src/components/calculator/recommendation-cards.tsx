/* src/components/calculator/recommendation-cards.tsx
 * Contextual recommendations (PRD §4.2A / §4.2B), split into two tracks that
 * follow the child's age bucket:
 *   - Artikel Gizi   (general nutrition articles)
 *   - Resep MPASI    (complementary feeding recipes)
 * Until the /edukasi CMS exists (later stage) these are static placeholder
 * cards linked to /edukasi — preserves the home page's PRD structure so
 * swapping in live data later is a data-only change (no JSX edit).
 */
import Link from "next/link";
import { ArrowRight, BookOpenText, CookingPot } from "lucide-react";

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

interface Item {
  title: string;
  body: string;
}

const ARTICLES: Record<AgeBucket, Item[]> = {
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
      body: "Perkenalkan puree tunggal — pisang, alpukat, nasi saring.",
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

const MPASI: Record<AgeBucket, Item[]> = {
  "0-6": [
    {
      title: "Hanya ASI",
      body: "Belum ada resep MPASI pada rentang usia ini — ASI saja sudah cukup.",
    },
    {
      title: "Menyiapkan kesiapan MPASI",
      body: "Perbekal diri dengan resep-resep yang akan diperkenalkan di usia 6 bulan.",
    },
  ],
  "6-8": [
    {
      title: "Puree pisang",
      body: "Tekstur halus untuk MPASI pertama; tinggal lumatkan pisang matang.",
    },
    {
      title: "Bubur nasi saring",
      body: "Bubur saring dengan sedikit ASI/formula, tanpa garam.",
    },
    {
      title: "Puree alpukat",
      body: "Lemak sehat untuk tumbuh kembang, tekstur lembut untuk awal MPASI.",
    },
  ],
  "9-11": [
    {
      title: "Bubur tim ayam jagung",
      body: "Protein hewani dan karbo kompleks, tekstur saring kasar.",
    },
    {
      title: "Puree ikan kuning labu",
      body: "Kombinasi protein & betakaroten untuk variasi rasa.",
    },
    {
      title: "Tim bayam telur",
      body: "Zat besi & protein dalam satu suapan lembut.",
    },
  ],
  "12-24": [
    {
      title: "Nasi tim lengkap",
      body: "Karbo, protein, sayur dalam porsi kecil siap makan keluarga.",
    },
    {
      title: "Bakso tahu sayur",
      body: "Tekstur kenyal lembut dan serat sayur dari rumah.",
    },
    {
      title: "Sup kental tempe jagung",
      body: "Protein nabati murah dan mengenyangkan.",
    },
  ],
  "24-60": [
    {
      title: "Piring lengkap prasekolah",
      body: "Satu porsi seimbang yang bisa disesuaikan menu keluarga.",
    },
    {
      title: "Camilan buah & yogurt",
      body: "Camilan padat gizi sebagai pengganti jajanan pabrikan.",
    },
    {
      title: "Pancake pisang oat",
      body: "Sarapan risiko gula rendah, serat tinggi.",
    },
  ],
};

function Section({
  title,
  Icon,
  items,
}: {
  title: string;
  Icon: typeof BookOpenText;
  items: Item[];
}) {
  return (
    <section className="flex flex-col gap-3">
      <h3 className="flex items-center gap-2 text-[16px] font-semibold leading-snug">
        <Icon className="size-5 text-primary" strokeWidth={1.5} aria-hidden />
        {title}
      </h3>
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
    </section>
  );
}

export function RecommendationCards({ ageMonths }: { ageMonths: number }) {
  const bucket = ageBucketOf(ageMonths);

  return (
    <section className="flex flex-col gap-6">
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

      <Section
        title="Artikel Gizi"
        Icon={BookOpenText}
        items={ARTICLES[bucket]}
      />
      <Section
        title="Resep MPASI"
        Icon={CookingPot}
        items={MPASI[bucket]}
      />
    </section>
  );
}
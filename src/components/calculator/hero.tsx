/* src/components/calculator/hero.tsx
 * Home hero (Design §3.4 / §5.1): Literata display title with a low-opacity
 * "Growth Line" SVG motif in the background — the curve is drawn from the
 * same WHO growth shape the product itself generates, used sparingly here
 * as the single signature element on the home page.
 */
export function Hero() {
  return (
    <section className="relative overflow-hidden px-5 pt-10 pb-6 md:px-8 md:pt-16 md:pb-10">
      {/* Growth Line signature (Design §5.1) */}
      <svg
        aria-hidden
        viewBox="0 0 400 120"
        preserveAspectRatio="none"
        className="pointer-events-none absolute -right-6 top-4 h-28 w-2/3 max-w-[520px] opacity-20 text-primary md:top-8 md:h-40"
      >
        <path
          d="M0,110 C60,95 120,70 180,52 S300,22 400,8"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
        />
        <path
          d="M0,116 C70,102 150,80 220,62 S340,32 400,20"
          fill="none"
          stroke="currentColor"
          strokeWidth={1}
          strokeLinecap="round"
          opacity={0.5}
        />
      </svg>

      <div className="relative mx-auto w-full max-w-[1120px]">
        <p className="mb-3 text-[13px] font-medium tracking-[0.06em] text-primary uppercase">
          Posyandu • Desa
        </p>
        <h1 className="font-display text-[28px] leading-[1.15] font-semibold text-foreground md:text-[40px] md:leading-[1.1]">
          Yuk cek tumbuh kembang si kecil.
        </h1>
        <p className="mt-3 max-w-xl text-[16px] leading-[1.6] text-muted-foreground md:text-[16px]">
          Hitung risiko stunting berdasarkan standar WHO 2006 dalam hitungan
          detik. Cukup isi jender, usia (bulan), berat, dan tinggi badan.
        </p>
      </div>
    </section>
  );
}
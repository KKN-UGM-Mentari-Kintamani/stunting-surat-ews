/* src/app/page.tsx
 * Home — the public stunting calculator (PRD §4.2A). Server component: only
 * reads whether someone is signed in (for the Save-to-History affordance);
 * all the math is client-side per PRD §5.3.
 */
import { Hero } from "@/components/calculator/hero";
import { StuntingCalculator } from "@/components/calculator/stunting-calculator";
import { createClient } from "@/lib/supabase/server";

export const metadata = {
  title: "Kalkulator Stunting",
  description:
    "Cek risiko stunting si kecil secara gratis berdasarkan standar WHO 2006. Cukup isi jender, usia (bulan), berat, dan tinggi badan.",
};

export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const isLoggedIn = !!user;

  return (
    <>
      <Hero />
      <StuntingCalculator isLoggedIn={isLoggedIn} />
    </>
  );
}
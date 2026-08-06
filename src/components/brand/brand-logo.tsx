/* src/components/brand/brand-logo.tsx
 * Sigap Desa brand mark: logo + wordmark. "SIGAP" uses the primary (growth
 * green), "DESA" uses the village gold (#A9762E — Design §1.1). Reusable across
 * navbar, login card and footer so the brand never drifts.
 */
import Image from "next/image";
import { cn } from "@/lib/utils";

const SIZES = {
  sm: { logo: 32, text: "text-[16px]" },
  md: { logo: 44, text: "text-[22px]" },
  lg: { logo: 64, text: "text-[30px]" },
} as const;

export function BrandLogo({
  size = "md",
  className,
}: {
  size?: keyof typeof SIZES;
  className?: string;
}) {
  const s = SIZES[size];
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <Image
        src="/logo-sigap.png"
        alt="Logo Sigap Desa"
        width={s.logo}
        height={s.logo}
        className="rounded-md object-contain"
      />
      <span className={cn("font-display font-bold leading-none tracking-wide", s.text)}>
        <span className="text-primary">SIGAP</span>{" "}
        <span className="text-[#A9762E]">DESA</span>
      </span>
    </span>
  );
}

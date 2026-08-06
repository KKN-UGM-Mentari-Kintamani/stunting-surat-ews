"use client";

/* src/components/layout/site-footer.tsx
 * Sigap Desa footer — three columns (Design §3.4):
 *   - Left   : brand, kop logos, short system description, KKN team credits.
 *   - Center : quick links to key pages.
 *   - Right  : official village site link + mini map (Google Maps embed, free,
 *              marker at the village office coordinates).
 * Hidden on /admin/*, /login, /reset-password and /profil (they own their chrome).
 */
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { ExternalLink } from "lucide-react";

import { BrandLogo } from "@/components/brand/brand-logo";
import { NAV_ITEMS } from "@/lib/navigation";

const VILLAGE_URL = "https://songanb.desa.id/";
const MAP_EMBED_URL =
  "https://maps.google.com/maps?q=-8.226914986487069,115.41094035360553&z=15&output=embed";

const QUICK_LINKS = [
  ...NAV_ITEMS.filter((i) => i.enabled).map((i) => ({
    href: i.href,
    label: i.label,
  })),
  { href: "/verifikasi", label: "Verifikasi Surat" },
];

const HIDDEN_PATHS = ["/admin", "/login", "/reset-password", "/profil"];

export function SiteFooter() {
  const pathname = usePathname();
  if (HIDDEN_PATHS.some((p) => pathname === p || pathname.startsWith(p + "/"))) {
    return null;
  }

  return (
    <footer className="border-t border-border bg-primary/10">
      <div className="mx-auto grid w-full max-w-[1120px] grid-cols-1 gap-10 px-5 py-12 md:grid-cols-[1.4fr_1fr_1fr] md:px-8">
        {/* Kiri: brand + deskripsi + tim KKN */}
        <div className="flex flex-col gap-4">
          <BrandLogo size="md" />
          <p className="max-w-sm text-[14px] leading-relaxed text-muted-foreground">
            Sigap Desa — layanan administrasi, pemantauan tumbuh kembang anak, dan
            edukasi gizi untuk Desa Songan B, Kecamatan Kintamani, Kabupaten Bangli.
          </p>
          {/* Logo KKN + text, lalu 2 logo kop surat di samping kanan */}
          <div className="flex flex-wrap items-center gap-3">
            <Image
              src="/Logo-Menkin.svg"
              alt="Logo KKN Mentari Kintamani"
              width={44}
              height={44}
              className="rounded object-contain"
            />
            <Image
              src="/Text-Logo-Menkin.svg"
              alt="KKN Mentari Kintamani"
              width={120}
              height={44}
              className="h-auto object-contain"
            />
            <Image
              src="/kop-logo-kiri.png"
              alt="Logo Kiri"
              width={40}
              height={40}
              className="rounded object-contain"
            />
            <Image
              src="/kop-logo-kanan.jpg"
              alt="Logo Kanan"
              width={36}
              height={36}
              className="rounded object-contain"
            />
          </div>
        </div>

        {/* Tengah: quick links */}
        <nav aria-label="Tautan cepat" className="flex flex-col gap-3">
          <p className="font-display text-[16px] font-semibold">Tautan Cepat</p>
          <ul className="flex flex-col gap-2">
            {QUICK_LINKS.map((l) => (
              <li key={l.href}>
                <Link
                  href={l.href}
                  className="text-[14px] text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
                >
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        {/* Kanan: link resmi + mini map */}
        <div className="flex flex-col gap-3">
          <p className="font-display text-[16px] font-semibold">Desa Songan B</p>
          <a
            href={VILLAGE_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-[14px] text-secondary underline-offset-4 hover:underline"
          >
            {VILLAGE_URL.replace(/\/$/, "")}
            <ExternalLink className="size-3.5" strokeWidth={1.5} aria-hidden />
          </a>
          <div className="mt-1 overflow-hidden rounded-md border border-border bg-white">
            <iframe
              src={MAP_EMBED_URL}
              title="Peta lokasi Kantor Desa Songan B"
              className="h-[180px] w-full"
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
            />
          </div>
        </div>
      </div>

      {/* Copyright — di tengah, melintasi seluruh footer */}
      <div className="border-t border-border/70 px-5 py-5">
        <p className="text-center text-[13px] leading-relaxed text-muted-foreground">
          © 2026 KKN-PPM UGM Mentari Kintamani. All rights reserved.
          <br />
          Designed &amp; Developed by Tim KKN.
        </p>
      </div>
    </footer>
  );
}

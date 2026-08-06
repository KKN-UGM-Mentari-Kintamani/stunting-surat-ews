import type { Metadata, Viewport } from "next";
import { Literata, Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";

import { AppShell } from "@/components/layout/app-shell";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";

// Design §2: max 2 families, max 2 weights each, swap, latin subset only.
const literata = Literata({
  variable: "--font-literata",
  subsets: ["latin"],
  weight: ["500", "600"], // Medium + SemiBold only
  display: "swap",
});

const jakarta = Plus_Jakarta_Sans({
  variable: "--font-jakarta",
  subsets: ["latin"],
  weight: ["400", "500", "600"], // Regular + Medium (labels/buttons) + SemiBold (H3)
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Sigap Desa — Kalkulator Stunting",
    template: "%s | Sigap Desa",
  },
  description:
    "Kalkulator deteksi dini stunting berbasis standar WHO 2006, pusat edukasi gizi & MPASI, dan layanan administrasi desa.",
  icons: [{ rel: "icon", url: "/logo-sigap.png" }],
};

export const viewport: Viewport = {
  themeColor: "#2F6B4F",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="id"
      className={`${literata.variable} ${jakarta.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-background text-foreground">
        <TooltipProvider>
          <AppShell>{children}</AppShell>
        </TooltipProvider>
        <Toaster position="top-center" richColors />
      </body>
    </html>
  );
}

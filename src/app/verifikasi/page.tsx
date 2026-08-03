"use client";

/* src/app/verifikasi/page.tsx
 * Public verification landing — input code → navigate to /verifikasi/[kode].
 * No login required (PRD §4.3). Anyone can verify a letter's authenticity.
 */
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Search, ShieldCheck } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function VerifikasiLanding() {
  const router = useRouter();
  const [kode, setKode] = useState("");

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = kode.trim().toUpperCase();
    if (trimmed.length < 4) return;
    router.push(`/verifikasi/${trimmed}`);
  }

  return (
    <div className="mx-auto flex w-full max-w-[1120px] flex-col items-center gap-6 px-5 py-16 md:px-8">
      <div className="flex flex-col items-center gap-3 text-center">
        <span className="flex size-14 items-center justify-center rounded-md bg-primary/10 text-primary">
          <ShieldCheck className="size-7" strokeWidth={1.5} aria-hidden />
        </span>
        <h1 className="font-display text-[28px] leading-[1.15] font-semibold md:text-[36px]">
          Verifikasi Keaslian Surat
        </h1>
        <p className="max-w-md text-[15px] leading-relaxed text-muted-foreground">
          Masukkan kode verifikasi yang tertera pada surat untuk memastikan
          keasliannya.
        </p>
      </div>

      <form onSubmit={submit} className="flex w-full max-w-sm flex-col gap-3">
        <Input
          type="text"
          value={kode}
          onChange={(e) => setKode(e.target.value.toUpperCase())}
          placeholder="Contoh: A3F9K2LP"
          className="text-center text-[18px] tracking-widest uppercase"
          maxLength={16}
          autoFocus
        />
        <Button type="submit" disabled={kode.trim().length < 4} className="w-full gap-2">
          <Search className="size-4" strokeWidth={1.5} aria-hidden />
          Cek Keaslian
        </Button>
      </form>
    </div>
  );
}
"use client";

/* src/app/layanan-surat/_components/layanan-surat-client.tsx
 * Client orchestrator for the letter service page. Decides which step to show:
 *   1. No warga_profil → profil form (progressive profiling)
 *   2. Profil exists → letter request form + letter history
 */
import { useState } from "react";

import { WargaProfilForm } from "@/app/layanan-surat/_components/warga-profil-form";
import { LetterRequestForm } from "@/app/layanan-surat/_components/letter-request-form";
import { LetterHistory } from "@/app/layanan-surat/_components/letter-history";
import type { WargaProfilData } from "@/lib/surat/types";

interface JenisSurat {
  id: string;
  nama_surat: string;
  kode_klasifikasi: string;
}

interface Props {
  userId: string;
  initialProfil: WargaProfilData | null;
  consented: boolean;
  jenisSuratList: JenisSurat[];
}

export function LayananSuratClient({
  userId,
  initialProfil,
  consented,
  jenisSuratList,
}: Props) {
  const [profil, setProfil] = useState<WargaProfilData | null>(initialProfil);
  const [refreshKey, setRefreshKey] = useState(0);

  if (!consented) {
    return (
      <div className="flex flex-col items-center gap-4 py-10 text-center">
        <p className="max-w-md text-[15px] leading-relaxed text-muted-foreground">
          Anda belum menyetujui pengumpulan data. Buka halaman{" "}
          <a href="/profil" className="font-medium text-secondary underline">
            Profil Saya
          </a>{" "}
          untuk memberikan persetujuan terlebih dahulu.
        </p>
      </div>
    );
  }

  if (!profil) {
    return (
      <WargaProfilForm
        onSaved={(newProfil) => setProfil(newProfil)}
      />
    );
  }

  return (
    <>
      <LetterRequestForm
        profil={profil}
        jenisSuratList={jenisSuratList}
        onSubmitted={() => setRefreshKey((k) => k + 1)}
      />
      <LetterHistory key={refreshKey} />
    </>
  );
}
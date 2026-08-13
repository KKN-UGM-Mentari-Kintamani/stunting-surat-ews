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
import { ConsentGate } from "@/components/consent/consent-gate";
import type { KadesConfig, TemplateKey, WargaProfilData } from "@/lib/surat/types";

interface JenisSurat {
  id: string;
  nama_surat: string;
  kode_klasifikasi: string;
  template_key: TemplateKey;
}

interface Props {
  initialProfil: WargaProfilData | null;
  consented: boolean;
  jenisSuratList: JenisSurat[];
  kades?: KadesConfig | null;
}

export function LayananSuratClient({
  initialProfil,
  consented,
  jenisSuratList,
  kades,
}: Props) {
  const [profil, setProfil] = useState<WargaProfilData | null>(initialProfil);
  const [refreshKey, setRefreshKey] = useState(0);

  if (!consented) {
    return (
      <div className="mx-auto w-full max-w-2xl">
        <ConsentGate />
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
        kades={kades}
        onSubmitted={() => setRefreshKey((k) => k + 1)}
      />
      <LetterHistory key={refreshKey} />
    </>
  );
}
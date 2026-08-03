/* src/app/verifikasi/[kode]/page.tsx
 * Public verification result (PRD §4.3). Calls fn_verifikasi_surat via the
 * service client (the function is granted to authenticated only; this page
 * is public, so service client is the reliable path — the function only
 * exposes masked non-sensitive data, no NIK/KK/address).
 *
 * Perforation edge is applied to the card as the signature element of the
 * letter module (Design §5.2).
 */
import type { Metadata } from "next";
import { CheckCircle2, XCircle } from "lucide-react";

import { createServiceClient } from "@/lib/supabase/server";
import { Card, CardContent } from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Verifikasi Surat",
  description: "Cek keaslian surat dari Desa Kintamani.",
};

interface VerifResult {
  kode_verifikasi: string;
  nama_surat: string;
  nomor_surat: string;
  tanggal_terbit: string | null;
  status_verif: string;
  nama_pemohon_masked: string | null;
}

export default async function VerifikasiDetailPage({
  params,
}: {
  params: Promise<{ kode: string }>;
}) {
  const { kode } = await params;
  const supabase = createServiceClient();
  const { data, error } = await supabase.rpc("fn_verifikasi_surat", {
    kode: kode.toUpperCase(),
  });

  const result = (data?.[0] as VerifResult | undefined) ?? null;
  const isValid = result?.status_verif === "valid";

  return (
    <div className="mx-auto flex w-full max-w-[1120px] flex-col items-center gap-6 px-5 py-16 md:px-8">
      {/* Perforation edge (Design §5.2) on the card */}
      <Card
        className="w-full max-w-md"
        style={{ borderTop: "2px dashed #E7E1D3" }}
      >
        <CardContent className="flex flex-col items-center gap-4 pt-8">
          {error || !result ? (
            <>
              <XCircle className="size-12 text-status-rejected-fg" strokeWidth={1.5} aria-hidden />
              <h1 className="font-display text-[22px] font-semibold text-foreground">
                Kode Tidak Ditemukan
              </h1>
              <p className="text-center text-[15px] text-muted-foreground">
                Kode verifikasi &quot;{kode}&quot; tidak terdaftar. Periksa kembali
                kode pada surat, atau hubungi kantor desa.
              </p>
            </>
          ) : (
            <>
              {isValid ? (
                <CheckCircle2 className="size-12 text-status-normal-fg" strokeWidth={1.5} aria-hidden />
              ) : (
                <XCircle className="size-12 text-status-rejected-fg" strokeWidth={1.5} aria-hidden />
              )}

              <h1 className="font-display text-[22px] font-semibold text-foreground">
                {isValid ? "Dokumen Valid" : "Dokumen Tidak Valid"}
              </h1>

              <dl className="flex w-full flex-col gap-3 text-[15px]">
                <div className="flex justify-between gap-4">
                  <dt className="text-muted-foreground">Jenis Surat</dt>
                  <dd className="text-right font-medium">{result.nama_surat}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-muted-foreground">Nomor Surat</dt>
                  <dd className="tabular-data text-right font-medium">
                    {result.nomor_surat ?? "—"}
                  </dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-muted-foreground">Tanggal Terbit</dt>
                  <dd className="text-right font-medium">
                    {result.tanggal_terbit
                      ? new Date(result.tanggal_terbit).toLocaleDateString("id-ID", {
                          day: "numeric",
                          month: "long",
                          year: "numeric",
                        })
                      : "—"}
                  </dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-muted-foreground">Atas Nama</dt>
                  <dd className="text-right font-medium">{result.nama_pemohon_masked ?? "—"}</dd>
                </div>
                <div className="flex justify-between gap-4 border-t border-border pt-3">
                  <dt className="text-muted-foreground">Kode Verifikasi</dt>
                  <dd className="tabular-data text-right font-medium">{result.kode_verifikasi}</dd>
                </div>
              </dl>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
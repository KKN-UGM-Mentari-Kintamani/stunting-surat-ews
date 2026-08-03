/* src/app/verifikasi/[kode]/page.tsx
 * Public document authenticity check (PRD §4.3). Shows minimal info with a
 * masked name — never NIK/KK/address. Uses the SECURITY DEFINER function via
 * service client (no user session).
 */
import Link from "next/link";
import { FileCheck, FileX, ShieldCheck } from "lucide-react";

import { createServiceClient } from "@/lib/supabase/server";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export const metadata = { title: "Verifikasi Surat" };

interface VerifResult {
  kode_verifikasi: string;
  nama_surat: string;
  nomor_surat: string;
  tanggal_terbit: string;
  status_verif: string;
  nama_pemohon_masked: string;
}

export default async function VerifikasiPage({
  params,
}: {
  params: Promise<{ kode: string }>;
}) {
  const { kode } = await params;
  const upper = kode.toUpperCase();

  const supabase = createServiceClient();
  const { data, error } = await supabase.rpc("fn_verifikasi_surat", { kode: upper });
  const found = (!error && data && data.length > 0 ? (data[0] as VerifResult) : null);

  return (
    <div className="mx-auto flex w-full max-w-[720px] flex-col gap-6 px-5 py-14 md:px-8">
      <div className="text-center">
        <span className="mb-3 inline-flex size-12 items-center justify-center rounded-md bg-primary/10 text-primary">
          <ShieldCheck className="size-6" strokeWidth={1.5} aria-hidden />
        </span>
        <h1 className="font-display text-[28px] leading-[1.15] font-semibold">
          Verifikasi Keaslian Surat
        </h1>
        <p className="mt-2 text-[15px] text-muted-foreground">
          Kode: <span className="tabular-data font-mono font-semibold">{upper}</span>
        </p>
      </div>

      {!found ? (
        <Alert variant="destructive">
          <FileX aria-hidden />
          <AlertTitle>Kode Tidak Ditemukan</AlertTitle>
          <AlertDescription>
            Kode verifikasi tidak valid atau surat tidak terdaftar. Periksa kembali
            kode pada dokumen Anda.
          </AlertDescription>
        </Alert>
      ) : (
        <>
          <Alert>
            <FileCheck aria-hidden />
            <AlertTitle>Dokumen Valid</AlertTitle>
            <AlertDescription>
              Surat ini terdaftar dan diterbitkan secara resmi oleh desa.
            </AlertDescription>
          </Alert>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <span className="size-2 rounded-full bg-status-normal-fg" aria-hidden />
                Informasi Surat
              </CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="flex flex-col gap-3 text-[15px]">
                <div className="flex justify-between gap-4">
                  <dt className="text-muted-foreground">Jenis Surat</dt>
                  <dd className="text-right font-medium">{found.nama_surat}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-muted-foreground">Nomor Surat</dt>
                  <dd className="tabular-data text-right font-medium">{found.nomor_surat}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-muted-foreground">Tanggal Terbit</dt>
                  <dd className="tabular-data text-right">
                    {new Date(found.tanggal_terbit).toLocaleDateString("id-ID", {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    })}
                  </dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-muted-foreground">Atas Nama</dt>
                  <dd className="text-right font-medium">{found.nama_pemohon_masked}</dd>
                </div>
              </dl>
            </CardContent>
          </Card>
        </>
      )}

      <p className="text-center text-[13px] text-muted-foreground">
        <Link href="/" className="font-medium text-secondary underline-offset-4 hover:underline">
          Kembali ke Portal Desa
        </Link>
      </p>
    </div>
  );
}

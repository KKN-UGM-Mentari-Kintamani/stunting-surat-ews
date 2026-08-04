"use client";

/* src/app/layanan-surat/_components/letter-preview.tsx
 * Smart Preview (PRD §4.1): React preview of the letter WITHOUT TTE image &
 * nomor (those are added only after approval). Mirrors the final PDF template
 * but keeps the signer identity read from the live Kades config.
 */
import type { IsianSnapshot, KadesConfig } from "@/lib/surat/types";

interface Props {
  namaSurat: string;
  snapshot: IsianSnapshot;
  kades?: KadesConfig | null;
}

function fmtTgl(v?: string): string {
  if (!v) return "—";
  const d = new Date(v);
  return Number.isNaN(d.getTime())
    ? v
    : d.toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" });
}

export function LetterPreview({ namaSurat, snapshot, kades }: Props) {
  const s = snapshot;
  const jabatan = kades?.jabatan || "Kepala Desa";
  const namaKades = kades?.nama_kades || "Kepala Desa";
  const nip = kades?.nip_kades || null;
  return (
    <div className="rounded-md border border-border bg-white p-6 text-foreground text-[13px]">
      <p className="mb-2 text-[12px] italic text-muted-foreground">
        Pratinjau — tanpa nomor surat &amp; tanda tangan. Nomor &amp; TTE akan
        ditambahkan otomatis setelah admin menyetujui.
      </p>
      <div className="border-t-2 border-black pt-3">
        <h2 className="text-center text-[14px] font-bold uppercase tracking-wide">
          Pemerintah Desa Kintamani
        </h2>
        <p className="text-center text-[11px]">Kecamatan Kintamani, Kabupaten Bangli</p>
      </div>
      <p className="mt-4 text-center font-semibold underline">{namaSurat}</p>
      <p className="mt-3 indent-8">Yang bertanda tangan di bawah ini {jabatan}, menerangkan bahwa:</p>
      <table className="mt-2 w-full text-[13px]">
        <tbody>
          <tr><td className="w-40 align-top">Nama</td><td className="w-2">:</td><td>{s.nama}</td></tr>
          <tr><td className="align-top">NIK</td><td>:</td><td>{s.nik}</td></tr>
          <tr><td className="align-top">Tempat / Tgl. Lahir</td><td>:</td><td>{s.tempat_lahir} / {fmtTgl(s.tanggal_lahir)}</td></tr>
          <tr><td className="align-top">Agama</td><td>:</td><td>{s.agama}</td></tr>
          <tr><td className="align-top">Pekerjaan</td><td>:</td><td>{s.pekerjaan}</td></tr>
          <tr><td className="align-top">Alamat</td><td>:</td><td>{s.alamat}</td></tr>
          {s.data_khusus?.nama_usaha && (
            <tr><td className="align-top">Nama Usaha</td><td>:</td><td>{s.data_khusus.nama_usaha}</td></tr>
          )}
          {s.data_khusus?.jenis_usaha && (
            <tr><td className="align-top">Jenis Usaha</td><td>:</td><td>{s.data_khusus.jenis_usaha}</td></tr>
          )}
        </tbody>
      </table>
      <p className="mt-3 indent-8 text-justify">
        Adalah benar penduduk Desa Kintamani, dan berdasarkan pengamatan serta
        data yang kami miliki, keterangan yang bersangkutan adalah benar.
      </p>
      <p className="mt-2 indent-8">Demikian surat keterangan ini dibuat untuk dipergunakan sebagaimana mestinya.</p>
      <div className="mt-6 text-right">
        <p>Kintamani, {new Date().toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}</p>
        <p className="mt-1">{jabatan},</p>
        <p className="mt-1 font-semibold">{namaKades}</p>
        <div className="mt-6 font-bold underline">[Tanda tangan &amp; stempel]</div>
        {nip && <p className="text-[11px]">NIP. {nip}</p>}
      </div>
    </div>
  );
}
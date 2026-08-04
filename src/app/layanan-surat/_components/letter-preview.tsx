"use client";

/* src/app/layanan-surat/_components/letter-preview.tsx
 * Smart Preview (PRD §4.1): React preview of the letter WITHOUT TTE image &
 * nomor (those are added only after approval). Mirrors the final PDF template
 * (surat-document.tsx): same kop, parties, body (buildSuratBody) and TTD block,
 * so the citizen sees exactly what the document will look like.
 */
import Image from "next/image";

import { buildSuratBody, DESA, type TemplateKey } from "@/lib/surat/body";
import type { IsianSnapshot, KadesConfig } from "@/lib/surat/types";

interface Props {
  namaSurat: string;
  templateKey: TemplateKey;
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

export function LetterPreview({ namaSurat, templateKey, snapshot, kades }: Props) {
  const s = snapshot;
  const jabatan = kades?.jabatan || "Perbekel Desa Songan B";
  const namaKades = kades?.nama_kades || "Perbekel Desa Songan B";
  const nip = kades?.nip_kades || null;
  const body = buildSuratBody(templateKey, s);
  const jk = s.jenis_kelamin === "P" ? "Perempuan" : "Laki-laki";

  return (
    <div className="rounded-md border border-border bg-white p-6 text-foreground text-[13px]">
      <p className="mb-2 text-[12px] italic text-muted-foreground">
        Pratinjau — tanpa nomor surat &amp; tanda tangan. Nomor &amp; TTE akan
        ditambahkan otomatis setelah admin menyetujui.
      </p>

      {/* Kop surat */}
      <div className="relative border-t-2 border-black pt-3">
        <div className="absolute top-3 left-0">
          <Image src="/Logo.png" alt="Logo Desa" width={72} height={72} className="rounded" />
        </div>
        <h2 className="text-center text-[14px] font-bold uppercase tracking-wide">
          Pemerintah Kabupaten Bangli
        </h2>
        <p className="text-center text-[12px] font-bold uppercase">Kecamatan Kintamani</p>
        <p className="text-center text-[14px] font-bold uppercase">Desa Songan B</p>
        <p className="text-center text-[11px]">Website: {DESA.website}</p>
        <div className="mt-2 border-t-[3px] border-b border-black" />
      </div>

      {/* Judul & nomor */}
      <p className="mt-5 text-center font-semibold underline">{namaSurat}</p>
      <p className="mt-1 text-center">Nomor: <span className="underline">—</span></p>

      {/* Pihak pertama (penandatangan) */}
      <p className="mt-5">Yang bertanda tangan di bawah ini:</p>
      <table className="mt-1 w-full text-[13px]">
        <tbody>
          <tr><td className="w-40 align-top">Nama</td><td className="w-2">:</td><td><strong>{namaKades}</strong></td></tr>
          <tr><td className="align-top">Jabatan</td><td>:</td><td>{jabatan}</td></tr>
        </tbody>
      </table>

      {/* Pihak kedua (pemohon) */}
      <p className="mt-4">Menerangkan dengan sebenarnya kepada:</p>
      <table className="mt-1 w-full text-[13px]">
        <tbody>
          <tr><td className="w-40 align-top">Nama Lengkap</td><td className="w-2">:</td><td>{s.nama}</td></tr>
          <tr><td className="align-top">NIK / No. KK</td><td>:</td><td>{s.nik}{s.no_kk ? ` / ${s.no_kk}` : ""}</td></tr>
          <tr><td className="align-top">Tempat / Tgl. Lahir</td><td>:</td><td>{s.tempat_lahir} / {fmtTgl(s.tanggal_lahir)}</td></tr>
          <tr><td className="align-top">Jenis Kelamin</td><td>:</td><td>{jk}</td></tr>
          <tr><td className="align-top">Agama</td><td>:</td><td>{s.agama}</td></tr>
          {s.status && (
            <tr><td className="align-top">Status</td><td>:</td><td>{s.status}</td></tr>
          )}
          <tr><td className="align-top">Pekerjaan</td><td>:</td><td>{s.pekerjaan}</td></tr>
          <tr><td className="align-top">Kewarganegaraan</td><td>:</td><td>{s.kewarganegaraan}</td></tr>
          <tr><td className="align-top">Alamat</td><td>:</td><td>{s.alamat}</td></tr>
        </tbody>
      </table>

      {/* Isi dinamis per jenis surat */}
      {body.map((t, i) => (
        <p key={i} className="mt-3 indent-8 text-justify">{t}</p>
      ))}

      {/* Tanda tangan */}
      <div className="mt-6 text-right">
        <p>{DESA.kota}, {new Date().toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}</p>
        <p className="mt-1">{jabatan},</p>
        <p className="mt-1 font-semibold">{namaKades}</p>
        <div className="mt-6 font-bold underline">[Tanda tangan &amp; stempel]</div>
        {nip && <p className="text-[11px]">NIP. {nip}</p>}
      </div>
    </div>
  );
}

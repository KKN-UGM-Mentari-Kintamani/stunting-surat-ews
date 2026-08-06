"use client";

/* src/app/layanan-surat/_components/letter-preview.tsx
 * Smart Preview (PRD §4.1): React preview of the letter WITHOUT TTE image &
 * nomor (those are added only after approval). Mirrors the final PDF template
 * (surat-document.tsx): same kop, parties, body (buildSuratLayout) and TTD
 * block, so the citizen sees exactly what the document will look like.
 */
import Image from "next/image";

import { buildSuratLayout, DESA, type TemplateKey } from "@/lib/surat/body";
import type { IsianSnapshot, KadesConfig } from "@/lib/surat/types";

interface Props {
  namaSurat: string;
  templateKey: TemplateKey;
  snapshot: IsianSnapshot;
  kades?: KadesConfig | null;
  /** Optional manually-entered number (shown by the admin walk-in preview). */
  nomorSurat?: string;
  /** SKTM: purpose phrase typed live by the admin during approval. */
  tujuanSktmOverride?: string;
}

export function LetterPreview({
  namaSurat,
  templateKey,
  snapshot,
  kades,
  nomorSurat,
  tujuanSktmOverride,
}: Props) {
  const s = snapshot;
  const jabatan = kades?.jabatan || "Perbekel Desa Songan B";
  const namaKades = kades?.nama_kades || "Perbekel Desa Songan B";
  const nip = kades?.nip_kades || null;
  const layout = buildSuratLayout(templateKey, s, { tujuanSktm: tujuanSktmOverride });

  return (
    <div className="rounded-md border border-border bg-white p-6 text-foreground text-[13px]">
      <p className="mb-2 text-[12px] italic text-muted-foreground">
        Pratinjau — tanpa nomor surat &amp; tanda tangan. Nomor &amp; TTE akan
        ditambahkan otomatis setelah admin menyetujui.
      </p>

      {/* Kop surat */}
      <div className="relative border-t-2 border-black pt-3">
        <div className="absolute top-3 left-0">
          <Image src="/kop-logo-kiri.png" alt="Logo Kiri" width={48} height={48} className="rounded" />
        </div>
        <h2 className="text-center text-[14px] font-bold uppercase tracking-wide">
          Pemerintah Kabupaten Bangli
        </h2>
        <p className="text-center text-[12px] font-bold uppercase">Kecamatan Kintamani</p>
        <p className="text-center text-[14px] font-bold uppercase">Desa Songan B</p>
        <p className="text-center text-[11px]">Website: {DESA.website}</p>
        <div className="absolute top-3 right-0">
          <Image src="/kop-logo-kanan.jpg" alt="Logo Kanan" width={40} height={40} className="rounded" />
        </div>
        <div className="mt-2 border-t-[3px] border-b border-black" />
      </div>

      {/* Judul & nomor */}
      <p className="mt-5 text-center font-semibold underline">{namaSurat}</p>
      <p className="mt-1 text-center">
        Nomor: <span className="underline">{nomorSurat?.trim() ? nomorSurat.trim() : "—"}</span>
      </p>

      {/* Pihak pertama (penandatangan) */}
      <p className="mt-5">{layout.introPenandatangan}</p>
      <table className="mt-1 w-full text-[13px]">
        <tbody>
          <tr><td className="w-40 align-top">Nama</td><td className="w-2">:</td><td><strong>{namaKades}</strong></td></tr>
          <tr><td className="align-top">Jabatan</td><td>:</td><td>{jabatan}</td></tr>
        </tbody>
      </table>

      {/* Pihak kedua (pemohon) */}
      <p className="mt-4">{layout.introPemohon}</p>
      <table className="mt-1 w-full text-[13px]">
        <tbody>
          {layout.identitasPemohon.map((r, i) => (
            <tr key={i}><td className="w-40 align-top">{r.label}</td><td className="w-2">:</td><td>{r.value}</td></tr>
          ))}
        </tbody>
      </table>

      {/* Isi dinamis per jenis surat */}
      {layout.isi.map((t, i) => (
        <p key={i} className="mt-3 indent-8 text-justify">{t}</p>
      ))}
      {layout.blokStatis && (
        <div className="mt-3 text-justify text-[12px] leading-snug">
          {layout.blokStatis.map((line, i) => (
            <p key={i} className="min-h-4 whitespace-pre-wrap">{line || "\u00A0"}</p>
          ))}
        </div>
      )}
      {layout.isiPenutup && (
        <p className="mt-3 indent-8 text-justify">{layout.isiPenutup}</p>
      )}

      {/* Tanda tangan */}
      <div className="mt-6 text-right">
        <p>{DESA.kota}, {new Date().toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}</p>
        {layout.ttdRoleLine && <p className="mt-1">{layout.ttdRoleLine}</p>}
        <p className="mt-1">{jabatan},</p>
        <p className="mt-1 font-semibold">{namaKades}</p>
        <div className="mt-6 font-bold underline">[Tanda tangan &amp; stempel]</div>
        {nip && <p className="text-[11px]">NIP. {nip}</p>}
      </div>
    </div>
  );
}

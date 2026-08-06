"use client";

/* src/app/layanan-surat/_components/letter-preview.tsx
 * Smart Preview (PRD §4.1): React preview of the letter WITHOUT TTE image &
 * nomor (those are added only after approval). Mirrors the final PDF template
 * (surat-document.tsx): same kop, parties, body (buildSuratLayout) and TTD
 * block, so the citizen sees exactly what the document will look like.
 *
 * Layout mirrors the PDF: logo kop kiri/kanan ~2.75cm, margin kiri 3.5cm,
 * font 12pt, line-height 1.15, isi justify, tabel identitas menjorok,
 * judul+nomor center, TTD kanan bawah rata kiri, blok agunan dotted mengisi.
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
    <div className="rounded-md border border-border bg-white p-6 text-foreground text-[12px] leading-[1.5]">
      <p className="mb-2 text-[12px] italic leading-normal text-muted-foreground">
        Pratinjau — tanpa nomor surat &amp; tanda tangan. Nomor &amp; TTE akan
        ditambahkan otomatis setelah admin menyetujui.
      </p>

      {/* Kop surat */}
      <div className="border-t-2 border-black pt-3">
        <div className="flex items-center">
          {/* 64pt ≈ 2.26cm ≈ 85px, sama untuk kiri & kanan (mengikuti PDF) */}
          <Image src="/kop-logo-kiri.png" alt="Logo Kiri" width={85} height={85} className="rounded shrink-0" />
          <div className="flex-1 px-2 text-center">
            <h2 className="text-[13px] font-bold uppercase tracking-wide leading-tight">
              Pemerintah Kabupaten Bangli
            </h2>
            <p className="text-[12px] font-bold uppercase leading-tight">Kecamatan Kintamani</p>
            <p className="text-[13px] font-bold uppercase leading-tight">Desa Songan B</p>
          </div>
          <Image src="/kop-logo-kanan.jpg" alt="Logo Kanan" width={85} height={85} className="rounded shrink-0" />
        </div>
        <div className="mt-2 border-t-[3px] border-b border-black" />
      </div>

      {/* Judul & nomor */}
      <p className="mt-4 text-center text-[13px] font-bold underline leading-none">{namaSurat}</p>
      <p className="mt-1 text-center leading-none">
        Nomor: {nomorSurat?.trim() ? nomorSurat.trim() : "—"}
      </p>

      {/* Pihak pertama (penandatangan) */}
      <p className="mt-4 text-justify">{layout.introPenandatangan}</p>
      <table className="mt-1 w-full pl-7 text-[12px]">
        <tbody>
          <tr><td className="w-32 align-top">Nama</td><td className="w-2">:</td><td><strong>{namaKades}</strong></td></tr>
          <tr><td className="align-top">Jabatan</td><td>:</td><td>{jabatan}</td></tr>
        </tbody>
      </table>

      {/* Pihak kedua (pemohon) */}
      <p className="mt-3 text-justify">{layout.introPemohon}</p>
      <table className="mt-1 w-full pl-7 text-[12px]">
        <tbody>
          {layout.identitasPemohon.map((r, i) => (
            <tr key={i}><td className="w-32 align-top">{r.label}</td><td className="w-2">:</td><td>{r.value}</td></tr>
          ))}
        </tbody>
      </table>

      {/* Isi dinamis per jenis surat */}
      {layout.isi.map((t, i) => (
        <p key={i} className="mt-2.5 indent-8 text-justify">{t}</p>
      ))}
      {layout.blokStatis && (
        <div className="mt-2 pl-7">
          {layout.blokStatis.map((baris, i) => (
            <div key={i} className={`flex items-end gap-1 ${baris.indent ? "ml-6" : ""}`}>
              {baris.segmen.map((seg, j) =>
                seg.titik ? (
                  <span key={j} className="flex-1 border-b border-dotted border-black" />
                ) : (
                  <span key={j} className="shrink-0">{seg.teks}</span>
                ),
              )}
            </div>
          ))}
        </div>
      )}
      {layout.isiPenutup && (
        <p className="mt-2.5 indent-8 text-justify">{layout.isiPenutup}</p>
      )}

      {/* Tanda tangan — blok di kanan bawah, teks rata kiri, lebar mengikuti isi */}
      <div className="mt-6 flex justify-end">
        <div className="text-left">
          <p className="leading-none">{DESA.kota}, {new Date().toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}</p>
          <p className="mt-1 leading-none">{jabatan},</p>
          <p className="mt-1 font-bold underline leading-none">{namaKades}</p>
          <div className="mt-4 font-bold underline">[Tanda tangan &amp; stempel]</div>
          {nip && <p className="mt-1 text-[11px] leading-none">NIP. {nip}</p>}
        </div>
      </div>
    </div>
  );
}

/* src/lib/surat/body.ts
 * Per-letter body paragraphs. One source of truth shared by the React preview
 * (letter-preview.tsx) and the final PDF (surat-document.tsx) so both always
 * render identical text for a given template_key.
 *
 * Village identity is fixed for Desa Songan B (per Template_Surat_Desa_SonganB.md);
 * dynamic values come from the frozen IsianSnapshot (Master Doc §3 Snapshot).
 */

import type { IsianSnapshot } from "@/lib/surat/types";

export type TemplateKey = "sktm" | "sku" | "skd";

export const DESA = {
  nama: "Desa Songan B",
  kecamatan: "Kecamatan Kintamani",
  kabupaten: "Kabupaten Bangli",
  provinsi: "Provinsi Bali",
  website: "https://songanb.desa.id/",
  kota: "Songan B",
};

export const PENUTUP_BAKU =
  "Demikian surat keterangan ini dibuat dengan sebenarnya, agar dapat dipergunakan sebagaimana mestinya.";

function paragraf(...teks: string[]): string[] {
  return teks.filter((t) => t.length > 0);
}

/** Builds the body paragraphs for a given letter type. */
export function buildSuratBody(
  templateKey: TemplateKey,
  s: IsianSnapshot,
): string[] {
  switch (templateKey) {
    case "skd": {
      return paragraf(
        `Berdasarkan pengamatan Kami, yang bersangkutan benar-benar penduduk yang berdomisili di ${DESA.nama} ${DESA.kecamatan} ${DESA.kabupaten} ${DESA.provinsi} dan terdaftar dalam register kependudukan Kami dengan NIK ${s.nik}.`,
        `Demikian Surat Keterangan Domisili ini dikeluarkan kepada yang bersangkutan untuk dipergunakan sebagaimana mestinya.`,
      );
    }
    case "sktm": {
      const noKk = s.no_kk?.trim() ? ` dengan Nomor Kartu Keluarga ${s.no_kk.trim()}` : "";
      return paragraf(
        `Menerangkan dengan sesungguhnya bahwa orang tersebut di atas beserta keluarganya benar-benar warga masyarakat ${DESA.nama} dan tergolong keluarga tidak mampu${noKk}.`,
        `Demikian surat keterangan tidak mampu ini kami buat, untuk dapat dipergunakan seperlunya. Atas perhatiannya kami ucapkan terima kasih.`,
      );
    }
    case "sku": {
      const jenis = s.data_khusus?.jenis_usaha?.trim();
      const nama = s.data_khusus?.nama_usaha?.trim();
      const tahun = s.data_khusus?.sejak_tahun?.trim();
      const lokasi = s.data_khusus?.lokasi_usaha?.trim();
      const usaha = [jenis, nama].filter(Boolean).join(" ");
      const sejak = tahun ? ` sejak Tahun ${tahun}` : "";
      const di = lokasi ? ` di ${lokasi}` : "";
      return paragraf(
        `Bahwa orang yang namanya tersebut di atas sepanjang pengetahuan dan pengamatan kami, memang benar mempunyai usaha ${usaha}${sejak}${di}.`,
        PENUTUP_BAKU,
      );
    }
    default:
      return paragraf(PENUTUP_BAKU);
  }
}

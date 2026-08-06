/* src/lib/surat/body.ts
 * Per-letter layout builder. One source of truth shared by the React preview
 * (letter-preview.tsx) and the final PDF (surat-document.tsx) so both always
 * render identical structure for a given template_key.
 *
 * Village identity is fixed for Desa Songan B (Template_Surat_Desa_SonganB.md);
 * dynamic values come from the frozen IsianSnapshot (Master Doc §3 Snapshot).
 *
 * The signer (Nama/Jabatan/NIP/TTE) is NOT part of the layout — renderers
 * inject it from surat_kades_config, so every letter uses the current config.
 */

import type { IsianSnapshot, TemplateKey } from "@/lib/surat/types";

export type { TemplateKey };

export const DESA = {
  nama: "Desa Songan B",
  kecamatan: "Kecamatan Kintamani",
  kabupaten: "Kabupaten Bangli",
  provinsi: "Provinsi Bali",
  website: "https://songanb.desa.id/",
  kota: "Songan B",
};

/** Structured layout of the letter body, driven by template_key. */
export interface SuratLayout {
  /** Intro line before the signer block ("Yang bertanda tangan di bawah ini :"). */
  introPenandatangan: string;
  /** Intro line before the applicant identity ("Dengan ini menerangkan bahwa :"). */
  introPemohon: string;
  /** Identity rows of the applicant (label → value from snapshot). */
  identitasPemohon: Array<{ label: string; value: string }>;
  /** Body paragraphs (justified, indented). */
  isi: string[];
  /** Verbatim static block (e.g. the SKU BRI agunan table). */
  blokStatis?: string[];
  /** Closing paragraph rendered AFTER the static block (e.g. SKU penutup). */
  isiPenutup?: string;
  /** Optional role line above the jabatan in the TTD block ("Yang membuat pernyataan"). */
  ttdRoleLine?: string;
}

/** Options that can override snapshot-derived text without mutating it. */
export interface LayoutOptions {
  /** SKTM: the purpose phrase typed by the village staff at approval. */
  tujuanSktm?: string;
}

const JK = (jk: string): string => (jk === "P" ? "Perempuan" : "Laki-laki");

function fmtTgl(v?: string): string {
  if (!v) return "—";
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return v;
  const months = [
    "Januari", "Februari", "Maret", "April", "Mei", "Juni",
    "Juli", "Agustus", "September", "Oktober", "November", "Desember",
  ];
  return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
}

function tahunDari(v?: string): string {
  if (!v) return "";
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? "" : String(d.getFullYear());
}

function row(label: string, value?: string | null): { label: string; value: string } {
  return { label, value: value?.trim() ? value.trim() : "—" };
}

const PENUTUP_BAKU =
  "Demikian surat keterangan ini dibuat dengan sebenarnya agar dapat dipergunakan sebagaimana mestinya.";

/** Verbatim agunan block from the SKU BRI example — kept untouched. */
const AGUNAN_BRI = [
  "1. Tanah................terletak di Desa.....................................................................................",
  "    No..........................Pipil No...............Persil No..............................kelas....................... Luas",
  "    ................M2/Are/Ha atas nama ...............................................sesuai SHM/Petuk D/ Letter",
  "    C No................................................................................................................... Tanggal",
  "    ...............................tinggal...................................................................................",
  "",
  "2. Fiducial/ Alat Rumah Tangga...........................................................................................",
  "    a.",
  "    b.",
  "    c.",
];

/** Builds the full letter layout for a given letter type + snapshot. */
export function buildSuratLayout(
  templateKey: TemplateKey,
  s: IsianSnapshot,
  opts: LayoutOptions = {},
): SuratLayout {
  const k = s.data_khusus ?? {};
  const ttl = `${s.tempat_lahir || "—"}, ${fmtTgl(s.tanggal_lahir)}`;
  const ttlTahun = `${s.tempat_lahir || "—"}, ${tahunDari(s.tanggal_lahir)}`;

  switch (templateKey) {
    case "skm": {
      return {
        introPenandatangan: "Yang bertanda tangan di bawah ini :",
        introPemohon: "Dengan ini menerangkan bahwa :",
        identitasPemohon: [
          row("Nama", s.nama),
          row("Jenis Kelamin", JK(s.jenis_kelamin)),
          row("Tempat/Tahun lahir", ttlTahun),
          row("Agama", s.agama),
          row("Pekerjaan", s.pekerjaan),
          row("Alamat", s.alamat),
        ],
        isi: [
          `Memang benar orang tersebut di atas Meninggal Dunia Pada tahun ${k.tahun_meninggal ?? "—"} di ${k.tempat_meninggal ?? "—"} di sebabkan karena ${k.sebab_meninggal ?? "—"}.`,
          "Demikian surat keterangan ini kami buat dengan sebenarnya agar dapat dipergunakan sebagaimana mestinya.",
        ],
      };
    }
    case "skl": {
      return {
        introPenandatangan: "Yang bertanda tangan di bawah ini :",
        introPemohon: "Dengan ini Menerangkan Bahwa :",
        identitasPemohon: [
          row("Nama", s.nama),
          row("Jenis Kelamin", JK(s.jenis_kelamin)),
          row("Tempat/tgl.lahir", ttl),
          row("NIK", s.nik),
          row("Agama", s.agama),
          row("Pekerjaan", s.pekerjaan),
          row("Alamat", s.alamat),
        ],
        isi: [
          `Memang benar orang tersebut di atas lahir di ${s.tempat_lahir || "—"} pada tanggal ${fmtTgl(s.tanggal_lahir)} dari ${k.nama_ayah ?? "—"} Sebagai Ayah dan ${k.nama_ibu ?? "—"} Sebagai Ibu.`,
          PENUTUP_BAKU,
        ],
      };
    }
    case "skli": {
      return {
        introPenandatangan: "Yang bertanda tangan di bawah ini :",
        introPemohon: "Dengan ini menerangkan bahwa :",
        identitasPemohon: [
          row("Nama", s.nama),
          row("Jenis Kelamin", JK(s.jenis_kelamin)),
          row("Tempat/Tgl.lahir", ttl),
          row("Agama", s.agama),
          row("Pekerjaan", s.pekerjaan),
          row("Alamat", s.alamat),
        ],
        isi: [
          `Memang benar orang tersebut di atas lahir dari seorang Ibu yang bernama ${k.nama_ibu ?? "—"}.`,
          "Demikian surat keterangan ini kami buat dengan sebenarnya agar dapat dipergunakan sebagaimana mestinya.",
        ],
      };
    }
    case "skp": {
      return {
        introPenandatangan: "Yang bertanda tangan di bawah ini :",
        introPemohon: "Dengan ini Menerangkan Bahwa :",
        identitasPemohon: [
          row("Nama", s.nama),
          row("Jenis Kelamin", JK(s.jenis_kelamin)),
          row("Tempat/tgl.lahir", ttl),
          row("Agama", s.agama),
          row("Pekerjaan", s.pekerjaan),
          row("Alamat Asal", s.alamat),
          row("Alamat Tujuan Pindah", k.alamat_tujuan_pindah),
          row("Alasan Pindah", k.alasan_pindah),
          row("Jenis Kepindahan", k.jenis_kepindahan),
          row("Status KK yang Pindah", k.status_kk_yang_pindah),
        ],
        isi: [PENUTUP_BAKU],
      };
    }
    case "sku": {
      return {
        introPenandatangan: "Yang bertanda tangan di bawah ini :",
        introPemohon: "Dengan ini menerangkan bahwa :",
        identitasPemohon: [
          row("Nama", s.nama),
          row("Jenis Kelamin", JK(s.jenis_kelamin)),
          row("Tempat/Tanggal Lahir", ttl),
          row("Pekerjaan", s.pekerjaan),
          row("Agama", s.agama),
          row("Alamat", s.alamat),
        ],
        isi: [
          `Memang benar orang tersebut di atas memiliki ${k.jenis_usaha ?? "—"} yang terletak di ${k.lokasi_usaha ?? "—"} dan masih memerlukan bantuan modal dari Bank BRI usaha tersebut di atas dengan agunan sebagai berikut :`,
        ],
        blokStatis: AGUNAN_BRI,
        isiPenutup: "Demikian surat keterangan ini kami buat dengan sebenarnya atas keterangan yang bersangkutan agar dapat dipergunakan sebagaimana mestinya.",
      };
    }
    case "skd": {
      return {
        introPenandatangan: "Yang bertanda tangan di bawah ini :",
        introPemohon: "Menerangkan dengan sebenarnya kepada:",
        identitasPemohon: [
          row("Nama Lengkap", s.nama),
          row("NIK / No. KK", `${s.nik}${s.no_kk ? ` / ${s.no_kk}` : ""}`),
          row("Tempat / Tgl. Lahir", ttl),
          row("Jenis Kelamin", JK(s.jenis_kelamin)),
          row("Agama", s.agama),
          row("Pekerjaan", s.pekerjaan),
          row("Alamat", s.alamat),
        ],
        isi: [
          `Memang benar orang tersebut di atas benar-benar penduduk yang berdomisili di ${DESA.nama} ${DESA.kecamatan} ${DESA.kabupaten} ${DESA.provinsi} dan terdaftar dalam register kependudukan Kami dengan NIK ${s.nik}.`,
          "Demikian Surat Keterangan Domisili ini dikeluarkan kepada yang bersangkutan untuk dipergunakan sebagaimana mestinya.",
        ],
      };
    }
    case "sktm":
    default: {
      // The purpose phrase is typed by the village staff at approval (per
      // decision). Fall back to the citizen's stated purpose so the preview
      // still reads as a draft; the final PDF always uses the admin phrase.
      const tujuan = opts.tujuanSktm?.trim() || k.tujuan_sktm?.trim() || s.tujuan_permohonan?.trim() || "untuk kepentingan yang sah";
      return {
        introPenandatangan: "Saya yang bertanda tangan di bawah ini :",
        introPemohon: "Menyatakan bahwa nama-nama sbb :",
        identitasPemohon: [
          row("Nama", s.nama),
          row("No KK", s.no_kk),
          row("NIK", s.nik),
          row("Alamat", s.alamat),
        ],
        isi: [
          `Berdasarkan surat pernyataan dari Kepala Keluarga dan hasil verifikasi dan validasi lapangan memang benar masuk kategori keluarga tidak mampu, dan ${tujuan}.`,
          "Apabila di kemudian hari terdapat ketidaksesuaian atau pelanggaran terhadap surat pernyataan ini, kami bersedia menerima konsekuensi sesuai ketentuan yang berlaku.",
          "Demikian surat pernyataan ini dibuat dengan sesungguhnya untuk dapat digunakan seperlunya.",
        ],
        ttdRoleLine: "Yang membuat pernyataan",
      };
    }
  }
}

/** All 7 template keys, for validation & dropdowns. */
export const TEMPLATE_KEYS: TemplateKey[] = ["sktm", "sku", "skp", "skd", "skl", "skli", "skm"];

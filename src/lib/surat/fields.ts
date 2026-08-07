/* src/lib/surat/fields.ts
 * Dynamic per-letter form fields (data_khusus). One registry shared by the
 * citizen form (letter-request-form) and the admin walk-in form (walk-in-form)
 * so the two never drift. Common identity fields come from warga_profil and
 * are NOT listed here.
 */
import type { TemplateKey } from "@/lib/surat/types";

export interface SuratFieldDef {
  key: string;
  label: string;
  required: boolean;
  /** 'text' | 'number' | 'year' | 'select' */
  type?: "text" | "number" | "year" | "select";
  placeholder?: string;
  options?: string[];
}

/** Which data_khusus fields each letter type needs. */
export const FIELD_DEFS: Record<TemplateKey, SuratFieldDef[]> = {
  sktm: [], // tujuan final diketik perangkat desa saat verifikasi
  skd: [],
  sku: [
    {
      key: "jenis_usaha",
      label: "Jenis Usaha",
      required: true,
      placeholder: "Contoh: Usaha Tani Hortikultura",
    },
    {
      key: "lokasi_usaha",
      label: "Lokasi Usaha",
      required: true,
      placeholder: "Contoh: Banjar Dalem, Desa Songan B",
    },
  ],
  skp: [
    {
      key: "alamat_tujuan_pindah",
      label: "Alamat Tujuan Pindah",
      required: true,
      placeholder: "Contoh: Jl. Tunjung, Denpasar Utara",
    },
    {
      key: "alasan_pindah",
      label: "Alasan Pindah",
      required: true,
      placeholder: "Contoh: Sekolah",
    },
    {
      key: "jenis_kepindahan",
      label: "Jenis Kepindahan",
      required: true,
      type: "select",
      options: ["Kepala Keluarga", "Anggota Keluarga", "Bersama KK", "Sebagian Anggota Keluarga"],
    },
    {
      key: "status_kk_yang_pindah",
      label: "Status KK yang Pindah",
      required: true,
      type: "select",
      options: ["Tumpang KK", "Membuat KK Baru", "Tidak Pindah KK"],
    },
  ],
  skl: [
    { key: "nama_ayah", label: "Nama Ayah", required: true, placeholder: "Contoh: I Gede Parwata" },
    { key: "nama_ibu", label: "Nama Ibu", required: true, placeholder: "Contoh: Luh Bentir" },
  ],
  skli: [
    { key: "nama_ibu", label: "Nama Ibu", required: true, placeholder: "Contoh: Ni Sari Adi" },
  ],
  skm: [
    {
      key: "tahun_meninggal",
      label: "Tahun Meninggal",
      required: true,
      type: "year",
      placeholder: "Contoh: 2014",
    },
    {
      key: "tempat_meninggal",
      label: "Tempat Meninggal",
      required: true,
      placeholder: "Contoh: Rumah",
    },
    {
      key: "sebab_meninggal",
      label: "Sebab Meninggal",
      required: true,
      placeholder: "Contoh: sakit",
    },
  ],
};

/** Fields of a letter type that are required (for button enablement). */
export function requiredKeys(templateKey: TemplateKey): string[] {
  return FIELD_DEFS[templateKey]
    .filter((f) => f.required)
    .map((f) => f.key);
}

/** All non-required field keys for reset purposes. */
export function allFieldKeys(templateKey: TemplateKey): string[] {
  return FIELD_DEFS[templateKey].map((f) => f.key);
}

/* src/lib/surat/types.ts
 * Shared Phase 2 types across server actions & future UI.
 */
export type StatusPermohonan = 'menunggu' | 'revisi' | 'disetujui' | 'ditolak';

/** Which layout renders a letter type (master_jenis_surat.template_key). */
export type TemplateKey =
  | "sktm"  // Surat Keterangan Tidak Mampu
  | "sku"   // Surat Keterangan Usaha (BRI)
  | "skp"   // Surat Keterangan Pindah Domisili
  | "skd"   // Surat Keterangan Domisili
  | "skl"   // Surat Keterangan Lahir
  | "skli"  // Surat Keterangan Lahir dari Seorang Ibu
  | "skm";  // Surat Keterangan Meninggal

/** Service-specific fields per letter type (data_khusus). */
export interface SuratFieldKhusus {
  /** SKU */
  jenis_usaha?: string;
  lokasi_usaha?: string;
  /** SKP */
  alamat_tujuan_pindah?: string;
  alasan_pindah?: string;
  jenis_kepindahan?: string;
  status_kk_yang_pindah?: string;
  /** SKL */
  nama_ayah?: string;
  /** SKL & SKLI */
  nama_ibu?: string;
  /** SKM */
  tahun_meninggal?: string;
  tempat_meninggal?: string;
  sebab_meninggal?: string;
  /** SKTM — the purpose phrase typed by the village staff at approval time. */
  tujuan_sktm?: string;
}

/** Kepala Desa / letter signer configuration (surat_kades_config). */
export interface KadesConfig {
  nama_kades: string;
  nip_kades: string | null;
  jabatan: string | null;
  ttd_cap_url: string | null;
}

export interface WargaProfilData {
  nik: string;
  no_kk?: string;
  nama: string;
  tempat_lahir: string;
  tanggal_lahir: string;
  jenis_kelamin: 'L' | 'P';
  status?: string;
  kewarganegaraan: string;
  agama: string;
  pekerjaan: string;
  alamat: string;
}

/** Shape of `data_isian_snapshot` — frozen at request time (Master Doc §3). */
export interface IsianSnapshot extends WargaProfilData {
  /** Service-specific fields, e.g. { jenis_usaha: "..." } for SKU. */
  data_khusus?: SuratFieldKhusus;
  /** Administrative consideration inputs (shown to the verifier admin). */
  tujuan_permohonan?: string;
  nomor_telepon?: string;
  /** Snapshotted proof that the applicant declared the data true & accountable. */
  pernyataan_benar?: boolean;
}

export interface PermohonanListItem {
  id: string;
  jenis_surat: string;
  kode_klasifikasi: string;
  status: StatusPermohonan;
  catatan_admin: string | null;
  nomor_surat_final: string | null;
  kode_verifikasi: string | null;
  pdf_final_url: string | null;
  disetujui_at: string | null;
  created_at: string;
  updated_at: string;
  processing: boolean;
  /** True if the PDF is still available for download (not yet purged). */
  pdf_available: boolean;
}

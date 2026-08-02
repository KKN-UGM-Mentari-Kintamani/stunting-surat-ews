/* src/lib/surat/types.ts
 * Shared Phase 2 types across server actions & future UI.
 */
export type StatusPermohonan = 'menunggu' | 'revisi' | 'disetujui' | 'ditolak';

export interface WargaProfilData {
  nik: string;
  no_kk?: string;
  nama: string;
  tempat_lahir: string;
  tanggal_lahir: string;
  agama: string;
  pekerjaan: string;
  alamat: string;
}

/** Shape of `data_isian_snapshot` — frozen at request time (Master Doc §3). */
export interface IsianSnapshot extends WargaProfilData {
  /** Service-specific fields, e.g. { nama_usaha: "..." } for SKU. */
  data_khusus?: Record<string, string>;
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

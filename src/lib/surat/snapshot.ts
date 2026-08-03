/* src/lib/surat/snapshot.ts
 * Builds the data_isian_snapshot from the citizen's profile + form values.
 * Snapshot pattern (Master Doc §3): frozen at request time, never re-read.
 */
import type { IsianSnapshot, WargaProfilData } from "@/lib/surat/types";

/** Builds the snapshot from a stored profile (warga_profil) + any field edits
 *  the citizen made in the smart form (family feature — overrides for this
 *  request only, profile default unchanged). */
export function buildSnapshot(
  profil: WargaProfilData,
  overrides: Partial<WargaProfilData>,
  dataKhusus: Record<string, string>,
): IsianSnapshot {
  return {
    nik: overrides.nik?.trim() || profil.nik,
    no_kk: overrides.no_kk?.trim() || profil.no_kk,
    nama: overrides.nama?.trim() || profil.nama,
    tempat_lahir: overrides.tempat_lahir?.trim() || profil.tempat_lahir,
    tanggal_lahir: overrides.tanggal_lahir || profil.tanggal_lahir,
    agama: overrides.agama?.trim() || profil.agama,
    pekerjaan: overrides.pekerjaan?.trim() || profil.pekerjaan,
    alamat: overrides.alamat?.trim() || profil.alamat,
    data_khusus: dataKhusus,
  };
}

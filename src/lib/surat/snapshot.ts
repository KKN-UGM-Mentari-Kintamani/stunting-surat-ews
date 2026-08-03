/* src/lib/surat/snapshot.ts
 * Client-side helper: builds an IsianSnapshot from profile data + form values.
 * The snapshot is frozen into permohonan_surat.data_isian_snapshot at submit
 * time (Master Doc §3 Snapshot pattern) — never re-read from live profile.
 */
import type { IsianSnapshot, WargaProfilData } from "@/lib/surat/types";

export function buildSnapshot(
  profil: WargaProfilData,
  dataKhusus?: Record<string, string>,
): IsianSnapshot {
  return {
    nik: profil.nik,
    no_kk: profil.no_kk,
    nama: profil.nama,
    tempat_lahir: profil.tempat_lahir,
    tanggal_lahir: profil.tanggal_lahir,
    agama: profil.agama,
    pekerjaan: profil.pekerjaan,
    alamat: profil.alamat,
    data_khusus: dataKhusus,
  };
}

/** Fetches warga_profil from a server action result — not imported in client. */
export function emptyProfil(): WargaProfilData {
  return {
    nik: "",
    no_kk: "",
    nama: "",
    tempat_lahir: "",
    tanggal_lahir: "",
    agama: "",
    pekerjaan: "",
    alamat: "",
  };
}
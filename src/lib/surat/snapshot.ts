/* src/lib/surat/snapshot.ts
 * Client-side helper: builds an IsianSnapshot from profile data + form values.
 * The snapshot is frozen into permohonan_surat.data_isian_snapshot at submit
 * time (Master Doc §3 Snapshot pattern) — never re-read from live profile.
 */
import type { IsianSnapshot, SuratFieldKhusus, WargaProfilData } from "@/lib/surat/types";

export function buildSnapshot(
  profil: WargaProfilData,
  opts: {
    dataKhusus?: SuratFieldKhusus;
    tujuanPermohonan?: string;
    nomorTelepon?: string;
    pernyataanBenar?: boolean;
  } = {},
): IsianSnapshot {
  return {
    nik: profil.nik,
    no_kk: profil.no_kk,
    nama: profil.nama,
    tempat_lahir: profil.tempat_lahir,
    tanggal_lahir: profil.tanggal_lahir,
    jenis_kelamin: profil.jenis_kelamin,
    status: profil.status,
    kewarganegaraan: profil.kewarganegaraan,
    agama: profil.agama,
    pekerjaan: profil.pekerjaan,
    alamat: profil.alamat,
    data_khusus: opts.dataKhusus,
    tujuan_permohonan: opts.tujuanPermohonan,
    nomor_telepon: opts.nomorTelepon,
    pernyataan_benar: opts.pernyataanBenar,
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
    jenis_kelamin: "L",
    status: "",
    kewarganegaraan: "WNI",
    agama: "",
    pekerjaan: "",
    alamat: "",
  };
}
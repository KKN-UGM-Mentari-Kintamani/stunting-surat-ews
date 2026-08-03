/* src/lib/surat/nomor.ts
 * Letter numbering + verification code helpers (PRD §5.3). Shared by:
 *  - the real VPS worker (worker/src/lib.ts has its own copy — keep in sync)
 *  - the DEV-MODE fallback in approveAction (when no worker is running)
 *
 * Format: {kode_klasifikasi}/{nomor_urut}/{bulan_romawi}/{tahun} → 470/012/VII/2026
 */
import { randomBytes } from "node:crypto";

export const BULAN_ROMawi = [
  "I", "II", "III", "IV", "V", "VI",
  "VII", "VIII", "IX", "X", "XI", "XII",
];

export function formatNomorSurat(
  kodeKlasifikasi: string,
  nomorUrut: number,
  date: Date = new Date(),
): string {
  const romawi = BULAN_ROMawi[date.getMonth()];
  const tahun = date.getFullYear();
  const urut = String(nomorUrut).padStart(3, "0");
  return `${kodeKlasifikasi}/${urut}/${romawi}/${tahun}`;
}

const VERIF_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no I/O/0/1

export function generateKodeVerifikasi(length = 8): string {
  const bytes = randomBytes(length);
  let out = "";
  for (let i = 0; i < length; i++) {
    out += VERIF_CHARS[bytes[i] % VERIF_CHARS.length];
  }
  return out;
}

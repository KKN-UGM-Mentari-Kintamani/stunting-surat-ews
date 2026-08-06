/* src/lib/surat/nomor.ts
 * Letter numbering + verification code helpers.
 *
 * Numbering is MANUAL: the village staff types the full number (e.g.
 * "470/012/VII/2026") when approving / publishing a letter — there is no
 * auto-increment counter. Verification codes stay auto-generated so each
 * document has a unique authenticity token.
 */
import { randomBytes } from "node:crypto";

const VERIF_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no I/O/0/1

export function generateKodeVerifikasi(length = 8): string {
  const bytes = randomBytes(length);
  let out = "";
  for (let i = 0; i < length; i++) {
    out += VERIF_CHARS[bytes[i] % VERIF_CHARS.length];
  }
  return out;
}

/** Validates a manually-entered letter number; returns an error message or null. */
export function validateNomorSurat(nomor: string): string | null {
  const v = nomor.trim();
  if (!v) return "Nomor surat wajib diisi.";
  if (v.length > 60) return "Nomor surat terlalu panjang (maks. 60 karakter).";
  if (!/^[0-9A-Za-z/._-]+$/.test(v)) {
    return "Nomor surat hanya boleh huruf, angka, dan tanda / . _ -";
  }
  return null;
}

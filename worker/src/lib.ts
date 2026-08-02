/* worker/src/lib.ts
 * Pure helpers: letter numbering (PRD §5.3) + verification code generation.
 * Kept free of side effects so they're unit-testable.
 */
import { randomBytes } from 'node:crypto';

/** Format: {kode_klasifikasi}/{nomor_urut}/{bulan_romawi}/{tahun} → 470/012/VII/2026 */
export function formatNomorSurat(
  kodeKlasifikasi: string,
  nomorUrut: number,
  date: Date = new Date(),
): string {
  const romawi = BULAN_ROMawi[date.getMonth()]; // getMonth() is 0-based
  const tahun = date.getFullYear();
  const urut = String(nomorUrut).padStart(3, '0');
  return `${kodeKlasifikasi}/${urut}/${romawi}/${tahun}`;
}

export const BULAN_ROMawi = [
  'I', 'II', 'III', 'IV', 'V', 'VI',
  'VII', 'VIII', 'IX', 'X', 'XI', 'XII',
];

const VERIF_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no I/O/0/1 — avoid confusion

/** Short random 8-char code (PRD §5.3): A3F9K2LP — unguessable, independent of number. */
export function generateKodeVerifikasi(length = 8): string {
  const bytes = randomBytes(length);
  let out = '';
  for (let i = 0; i < length; i++) {
    out += VERIF_CHARS[bytes[i] % VERIF_CHARS.length];
  }
  return out;
}

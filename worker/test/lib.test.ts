/* worker/test/lib.test.ts — run with: npx tsx test/lib.test.ts */
import { formatNomorSurat, generateKodeVerifikasi, BULAN_ROMawi } from '../src/lib';

let failed = 0;
function check(name: string, cond: boolean) {
  if (!cond) { failed++; console.error(`✗ ${name}`); }
  else console.log(`✓ ${name}`);
}

// formatNomorSurat with a fixed date (July = month 6 zero-based → VII)
check('nomor format 470/012/VII/2026', formatNomorSurat('470', 12, new Date(2026, 6, 5)) === '470/012/VII/2026');
check('nomor pads to 3 digits', formatNomorSurat('474', 5, new Date(2026, 0, 1)) === '474/005/I/2026');
check('roman month array 12', BULAN_ROMawi.length === 12);

// verification code: length 8, only unambiguous alnum
const codes = Array.from({ length: 100 }, () => generateKodeVerifikasi());
check('code length 8', codes.every((c) => c.length === 8));
check('code unambiguous charset', codes.every((c) => /^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]+$/.test(c)));
check('codes mostly unique', new Set(codes).size > 90);

console.log(failed === 0 ? '\nALL PASS' : `\n${failed} FAILED`);
process.exit(failed === 0 ? 0 : 1);

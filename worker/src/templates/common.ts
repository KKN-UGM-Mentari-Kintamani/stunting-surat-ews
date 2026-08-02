/* worker/src/templates/common.ts
 * Shared helpers for letter templates: date formatting + document shell.
 */
export const BULAN_NAMA = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
];

export function formatTanggalLong(date: Date): string {
  return `${date.getDate()} ${BULAN_NAMA[date.getMonth()]} ${date.getFullYear()}`;
}

export function tglLahirStr(v: unknown): string {
  if (typeof v !== 'string' || !v) return '—';
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return v;
  return `${d.getDate()} ${BULAN_NAMA[d.getMonth()]} ${d.getFullYear()}`;
}

/** Shared document shell — official letter style (Design §9: pure white,
 * black text, serif body, gold header line). */
export function documentShell(bodyHtml: string): string {
  return `<!doctype html>
<html lang="id">
<head>
<meta charset="utf-8" />
<style>
  @page { size: A4; margin: 0; }
  * { box-sizing: border-box; }
  body {
    font-family: 'Times New Roman', 'Liberation Serif', serif;
    color: #000;
    font-size: 12pt;
    line-height: 1.5;
    margin: 0;
  }
  .kop {
    text-align: center;
    border-bottom: 2px solid #000;
    padding-bottom: 8px;
    margin-bottom: 16px;
  }
  .kop h1 { font-size: 15pt; margin: 0 0 2px; letter-spacing: 1px; }
  .kop h2 { font-size: 13pt; margin: 0 0 2px; font-weight: normal; text-decoration: underline; }
  .kop p { margin: 0; font-size: 10pt; }
  .nomor { text-align: center; font-size: 12pt; margin-bottom: 18px; }
  .nomor .no { text-decoration: underline; }
  .isi { text-align: justify; }
  .ttd { margin-top: 36px; text-align: right; }
  .ttd .jabatan { margin: 0; }
  .ttd .nama { font-weight: bold; text-decoration: underline; margin: 4px 0; }
  .ttd .nip { font-size: 10pt; margin: 0; }
  .ttd img.ttd-img { height: 70px; }
  .tabel { width: 100%; border-collapse: collapse; }
  .tabel td { padding: 2px 8px; vertical-align: top; }
  .tabel td.k { width: 160px; }
  .tabel td.v { width: 20px; }
  .alamat-lengkap { margin: 8px 0; }
</style>
</head>
<body>
  ${bodyHtml}
</body>
</html>`;
}

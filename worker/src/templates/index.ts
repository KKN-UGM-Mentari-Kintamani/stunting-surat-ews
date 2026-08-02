/* worker/src/templates/index.ts
 * Builds the final letter HTML for a given approval. Templates mirror the
 * React preview components in the Next.js app (PRD §5.1: preview = React,
 * final = Puppeteer). The Kades signature image is embedded as a base64
 * data-URI read from the private bucket.
 */
import { documentShell, formatTanggalLong, tglLahirStr } from './common';
import type { ApprovalData } from '../db';
import { downloadTteImage } from '../storage';

function escapeHtml(v: unknown): string {
  return String(v ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

interface Snapshot {
  nik?: string;
  no_kk?: string;
  nama?: string;
  tempat_lahir?: string;
  tanggal_lahir?: string;
  agama?: string;
  pekerjaan?: string;
  alamat?: string;
  [key: string]: unknown; // service-specific fields (e.g. nama_usaha)
}

/** Copy of village letterhead — adjust to the real village. */
function kopSurat(): string {
  return `
  <div class="kop">
    <h1>PEMERINTAH KABUPATEN KLUNGKUNG</h1>
    <h2>KECAMATAN KINTAMANI</h2>
    <h2>DESA KINTAMANI</h2>
    <p>Jl. Raya Kintamani No. 1, Kintamani, Bangli, Bali</p>
  </div>`;
}

function tabelIdentitas(s: Snapshot): string {
  const rows: Array<[string, string]> = [
    ['Nama', s.nama ?? ''],
    ['NIK', s.nik ?? ''],
    ['Tempat / Tanggal Lahir', `${s.tempat_lahir ?? ''} / ${tglLahirStr(s.tanggal_lahir)}`],
    ['Agama', s.agama ?? ''],
    ['Pekerjaan', s.pekerjaan ?? ''],
    ['Alamat', s.alamat ?? ''],
  ];
  const html = rows
    .map(
      ([k, v]) =>
        `<tr><td class="k">${escapeHtml(k)}</td><td class="v">:</td><td>${escapeHtml(v)}</td></tr>`,
    )
    .join('');
  return `<table class="tabel">${html}</table>`;
}

function ttdHtml(data: ApprovalData, tteBase64: string | null): string {
  return `
  <div class="ttd">
    <p class="jabatan">${escapeHtml(data.jabatanKades)},</p>
    <p class="jabatan">${escapeHtml(data.namaKades)}</p>
    ${tteBase64 ? `<img class="ttd-img" src="data:image/png;base64,${tteBase64}" alt="ttd" />` : ''}
    <p class="nama">${escapeHtml(data.namaKades)}</p>
    ${data.nipKades ? `<p class="nip">NIP. ${escapeHtml(data.nipKades)}</p>` : ''}
  </div>`;
}

export async function buildLetterHtml(
  data: ApprovalData,
  nomorSurat: string,
  kodeVerifikasi: string,
): Promise<string> {
  const s = (data.snapshot ?? {}) as Snapshot;
  const tte =
    data.ttdCapUrl && !data.ttdCapUrl.startsWith('http')
      ? await downloadTteImage(data.ttdCapUrl)
      : null;
  const tteBase64 = tte ? tte.toString('base64') : null;
  const today = new Date();

  const isi = `
  <div class="isi">
    <p style="text-indent: 40px; margin-bottom: 16px;">
      Yang bertanda tangan di bawah ini ${escapeHtml(data.jabatanKades)}, menerangkan bahwa:
    </p>
    ${tabelIdentitas(s)}
    <p class="alamat-lengkap">
      Adalah benar penduduk Desa Kintamani, Kecamatan Kintamani, Kabupaten Klungkung,
      dan berdasarkan pengamatan serta data yang kami miliki, keterangan yang bersangkutan adalah benar.
    </p>
    <p style="text-indent: 40px;">
      Demikian surat keterangan ini dibuat untuk dipergunakan sebagaimana mestinya.
    </p>
  </div>`;

  const body = `
  ${kopSurat()}
  <div class="nomor">
    <p>Nomor : <span class="no">${escapeHtml(nomorSurat)}</span></p>
  </div>
  ${isi}
  <div class="nomor" style="margin-top: 24px; font-size: 10pt;">
    <p>Kode Verifikasi: ${escapeHtml(kodeVerifikasi)}</p>
  </div>
  <p style="text-align: left; font-size: 10pt;">${escapeHtml(data.namaSurat)}</p>
  <p style="text-align: right; font-size: 11pt; margin-top: 8px;">
    Kintamani, ${formatTanggalLong(today)}
  </p>
  ${ttdHtml(data, tteBase64)}`;

  return documentShell(body);
}

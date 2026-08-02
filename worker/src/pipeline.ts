/* worker/src/pipeline.ts
 * The "Setujui" pipeline (PRD §4.2, §5.3, §6) — atomic unit of work:
 *
 *  1. Open transaction, SELECT ... FOR UPDATE on the counter row
 *     (per kode_klasifikasi + tahun) — reserves the next letter number.
 *  2. Generate verification code.
 *  3. Render PDF via Puppeteer (from data_isian_snapshot + Kades config + TTE).
 *  4. Upload PDF to the private `surat-pdf` bucket.
 *  5. Update permohonan → disetujui (+ nomor, kode, pdf url, disetujui_at).
 *  6. Increment the counter.
 *  7. COMMIT.
 *
 *  On ANY failure → ROLLBACK: number is not consumed, status stays menunggu,
 *  `processing_at` cleared — PRD §4.4 / §6 transactional integrity.
 */
import { getPool, type ApprovalData } from './db';
import { formatNomorSurat, generateKodeVerifikasi } from './lib';
import { renderPdf } from './renderer';
import { uploadPdf } from './storage';
import { buildLetterHtml } from './templates';

export type PipelineResult =
  | { ok: true; nomorSurat: string; pdfUrl: string }
  | { ok: false; error: string };

export async function runApprovalPipeline(data: ApprovalData): Promise<PipelineResult> {
  const pool = getPool();
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const today = new Date();
    const tahun = today.getFullYear();

    // 1. Lock the counter row for THIS kode_klasifikasi + tahun (race-safe,
    //    scoped per type — different letter types don't block each other).
    const { rows: [counterRow] } = await client.query(
      `SELECT nomor_urut FROM public.nomor_surat_counter
         WHERE kode_klasifikasi = $1 AND tahun = $2
         FOR UPDATE`,
      [data.kodeKlasifikasi, tahun],
    );
    const nextUrut = (counterRow?.nomor_urut ?? 0) + 1;
    const nomorSurat = formatNomorSurat(data.kodeKlasifikasi, nextUrut, today);
    const kodeVerifikasi = generateKodeVerifikasi();

    // 2. Mark the request as "processing" inside the transaction so the UI
    //    poll sees it; rolled back on failure.
    await client.query(
      `UPDATE public.permohonan_surat
          SET processing_at = now(), nomor_surat_final = $2, kode_verifikasi = $3
        WHERE id = $1 AND status = 'menunggu'`,
      [data.permohonanId, nomorSurat, kodeVerifikasi],
    );

    // 3. Render PDF (slow — Puppeteer; TTE fetched from private bucket by URL).
    let pdfBuffer: Buffer;
    try {
      const html = await buildLetterHtml(data, nomorSurat, kodeVerifikasi);
      pdfBuffer = await renderPdf(html);
    } catch (err) {
      await client.query('ROLLBACK');
      return { ok: false, error: err instanceof Error ? err.message : 'Render gagal' };
    }

    // 4. Upload to private bucket.
    const pdfPath = `${tahun}/${data.kodeKlasifikasi}/${nomorSurat.replace(/\//g, '-')}.pdf`;
    const pdfUrl = await uploadPdf(pdfPath, pdfBuffer);
    if (!pdfUrl) {
      await client.query('ROLLBACK');
      return { ok: false, error: 'Upload PDF gagal' };
    }

    // 5+6. Finalize + increment counter, then commit.
    await client.query(
      `UPDATE public.permohonan_surat
          SET status = 'disetujui',
              pdf_final_url = $2,
              disetujui_at = now(),
              processing_at = NULL
        WHERE id = $1`,
      [data.permohonanId, pdfUrl],
    );
    await client.query(
      `INSERT INTO public.nomor_surat_counter (kode_klasifikasi, tahun, nomor_urut)
       VALUES ($1, $2, $3)
       ON CONFLICT (kode_klasifikasi, tahun)
       DO UPDATE SET nomor_urut = EXCLUDED.nomor_urut`,
      [data.kodeKlasifikasi, tahun, nextUrut],
    );

    await client.query('COMMIT');
    return { ok: true, nomorSurat, pdfUrl };
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    return {
      ok: false,
      error: err instanceof Error ? err.message : 'Kesalahan tak dikenal',
    };
  } finally {
    client.release();
  }
}

/* worker/src/index.ts
 * Worker HTTP server (VPS). Vercel pushes approval jobs here via POST /render
 * with a shared secret; worker renders the PDF atomically and updates the DB.
 *
 * Endpoints:
 *   GET  /health            — liveness probe
 *   POST /render            — { permohonanId } + Authorization: Bearer <secret>
 *   GET  /verifikasi/:kode  — (optional) could proxy verification; not needed MVP
 */
import express from 'express';
import { getPool } from './db';
import { runApprovalPipeline } from './pipeline';
import { closeBrowser } from './renderer';

const app = express();
app.use(express.json({ limit: '1mb' }));

const PORT = Number(process.env.PORT ?? 8080);
const SECRET = process.env.WORKER_SECRET;
if (!SECRET) {
  console.error('[worker] Missing WORKER_SECRET env var — refusing to start.');
  process.exit(1);
}

function auth(req: express.Request): boolean {
  const h = req.headers.authorization ?? '';
  return h === `Bearer ${SECRET}`;
}

app.get('/health', (_req, res) => {
  res.json({ ok: true, uptime: process.uptime() });
});

app.post('/render', async (req, res) => {
  if (!auth(req)) {
    return res.status(401).json({ ok: false, error: 'Unauthorized' });
  }
  const permohonanId = req.body?.permohonanId as string | undefined;
  if (!permohonanId || typeof permohonanId !== 'string') {
    return res.status(400).json({ ok: false, error: 'permohonanId wajib' });
  }

  try {
    // Load approval data inside a read transaction first.
    const pool = getPool();
    const { rows } = await pool.query(
      `SELECT
         p.id AS permohonan_id,
         p.data_isian_snapshot,
         m.id AS jenis_surat_id,
         m.nama_surat,
         m.kode_klasifikasi,
         c.nama_kades,
         c.nip_kades,
         c.jabatan_kades,
         c.ttd_cap_url
       FROM public.permohonan_surat p
       JOIN public.master_jenis_surat m ON m.id = p.jenis_surat_id
       CROSS JOIN public.surat_kades_config c
       WHERE p.id = $1 AND p.status = 'menunggu' AND p.deleted_at IS NULL`,
      [permohonanId],
    );
    if (rows.length === 0) {
      return res.status(404).json({ ok: false, error: 'Permohonan tidak ditemukan / bukan menunggu' });
    }
    const r = rows[0];

    const result = await runApprovalPipeline({
      permohonanId: r.permohonan_id,
      jenisSuratId: r.jenis_surat_id,
      namaSurat: r.nama_surat,
      kodeKlasifikasi: r.kode_klasifikasi,
      snapshot: r.data_isian_snapshot,
      namaKades: r.nama_kades,
      nipKades: r.nip_kades,
      jabatanKades: r.jabatan_kades,
      ttdCapUrl: r.ttd_cap_url,
    });

    if (!result.ok) {
      // Rollback happened inside pipeline; report to Vercel for the admin UI.
      return res.status(500).json({ ok: false, error: result.error });
    }
    return res.json({ ok: true, nomorSurat: result.nomorSurat, pdfUrl: result.pdfUrl });
  } catch (err) {
    console.error('[worker] /render error:', err);
    return res.status(500).json({ ok: false, error: 'Worker error' });
  }
});

const server = app.listen(PORT, () => {
  console.log(`[worker] listening on :${PORT}`);
});

function shutdown(signal: string) {
  console.log(`[worker] ${signal} received — shutting down.`);
  server.close(async () => {
    await closeBrowser();
    await getPool().end();
    process.exit(0);
  });
}
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

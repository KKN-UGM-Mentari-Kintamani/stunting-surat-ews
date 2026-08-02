/* src/lib/surat/config.ts
 * Vercel-side config for the Phase 2 worker.
 */
export function getWorkerConfig(): { url: string; secret: string } {
  const url = process.env.WORKER_URL;
  const secret = process.env.WORKER_SECRET;
  if (!url || !secret) {
    throw new Error('Missing WORKER_URL / WORKER_SECRET env vars');
  }
  return { url: url.replace(/\/$/, ''), secret };
}

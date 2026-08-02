/* worker/src/storage.ts
 * Uploads a rendered PDF to the PRIVATE `surat-pdf` bucket using the service
 * role key (bypasses RLS — this is a trusted server job, never user input).
 */
import { createClient } from '@supabase/supabase-js';

const BUCKET = 'surat-pdf';

function getServiceClient() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Missing SUPABASE_URL / SERVICE_ROLE_KEY');
  return createClient(url, key, { auth: { persistSession: false } });
}

/** Returns the storage path (for pdf_final_url) or null on failure. */
export async function uploadPdf(
  path: string,
  buffer: Buffer,
): Promise<string | null> {
  const supabase = getServiceClient();
  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, buffer, {
      upsert: false,
      contentType: 'application/pdf',
    });
  if (error) {
    console.error('[storage] upload failed:', error.message);
    return null;
  }
  return path;
}

/** Fetches the Kades TTE image from the PRIVATE `surat-ttd` bucket (server-side). */
export async function downloadTteImage(path: string): Promise<Buffer | null> {
  const supabase = getServiceClient();
  const { data, error } = await supabase.storage.from('surat-ttd').download(path);
  if (error || !data) {
    console.error('[storage] tte download failed:', error?.message);
    return null;
  }
  return Buffer.from(await data.arrayBuffer());
}

/* worker/src/db.ts
 * Direct Postgres client for transactional approve pipeline (SELECT ... FOR
 * UPDATE on the counter row — supabase-js is REST, cannot do row locks).
 */
import { Pool } from 'pg';

let pool: Pool | null = null;

export function getPool(): Pool {
  if (!pool) {
    const conn = process.env.SUPABASE_DB_CONNECTION_STRING;
    if (!conn) throw new Error('Missing SUPABASE_DB_CONNECTION_STRING');
    pool = new Pool({ connectionString: conn, max: 5 });
  }
  return pool;
}

export interface ApprovalData {
  permohonanId: string;
  jenisSuratId: string;
  namaSurat: string;
  kodeKlasifikasi: string;
  snapshot: Record<string, unknown>;
  namaKades: string;
  nipKades: string | null;
  jabatanKades: string;
  ttdCapUrl: string | null;
}

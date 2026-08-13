/* src/app/api/cron/cleanup-pdf/route.ts
 * Daily cron (vercel.json) that enforces the 7-day PDF retention (Flow §2.4).
 * Deletes approved letters' PDFs from the PRIVATE 'surat-pdf' bucket once they
 * are older than 7 days, then nulls pdf_final_url so the UI falls back to
 * "Masa unduh telah berakhir".
 *
 * Idempotent & safe to re-run: the query only picks rows with a non-null
 * pdf_final_url, so a second run finds nothing (removed: 0).
 *
 * Security: Vercel Cron sends `Authorization: Bearer <CRON_SECRET>` when the
 * env var is set. The route rejects anything that doesn't match, so the
 * endpoint can never be triggered by an anonymous visitor.
 */
import { NextRequest, NextResponse } from "next/server";

import { createServiceClient } from "@/lib/supabase/server";

export const maxDuration = 60;

const RETENTION_DAYS = 7;

function isAuthorized(req: NextRequest): boolean {
  const expected = process.env.CRON_SECRET;
  if (!expected) {
    console.error("[cleanup-pdf] CRON_SECRET env var is not set — refusing to run.");
    return false;
  }
  const auth = req.headers.get("authorization");
  return auth === `Bearer ${expected}`;
}

export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createServiceClient();
  const cutoff = new Date(Date.now() - RETENTION_DAYS * 24 * 60 * 60 * 1000).toISOString();

  // Candidate rows: approved, past retention, still holding a PDF path.
  const { data: rows, error: qErr } = await supabase
    .from("permohonan_surat")
    .select("id, pdf_final_url")
    .eq("status", "disetujui")
    .lt("disetujui_at", cutoff)
    .not("pdf_final_url", "is", null)
    .is("deleted_at", null);

  if (qErr) {
    console.error("[cleanup-pdf] query failed:", qErr.message);
    return NextResponse.json({ ok: false, error: "Query failed" }, { status: 500 });
  }

  const candidates = (rows ?? []) as { id: string; pdf_final_url: string }[];
  if (candidates.length === 0) {
    return NextResponse.json({ ok: true, removed: 0, errors: [] });
  }

  // 1) Delete the physical files (best-effort — log failures, keep going).
  const paths = candidates.map((r) => r.pdf_final_url);
  const { error: delErr } = await supabase.storage.from("surat-pdf").remove(paths);
  if (delErr) {
    console.error("[cleanup-pdf] storage remove failed:", delErr.message);
  }

  // 2) Null the URL regardless, so retention holds even if a file couldn't be
  //    removed (the orphan is private, un-referenced, and cleaned later).
  const { error: uErr } = await supabase
    .from("permohonan_surat")
    .update({ pdf_final_url: null })
    .in(
      "id",
      candidates.map((r) => r.id),
    );

  if (uErr) {
    console.error("[cleanup-pdf] update failed:", uErr.message);
    return NextResponse.json({ ok: false, error: "Update failed" }, { status: 500 });
  }

  console.log(`[cleanup-pdf] removed ${candidates.length} expired PDF(s)`);
  return NextResponse.json({
    ok: true,
    removed: candidates.length,
    errors: delErr ? [delErr.message] : [],
  });
}

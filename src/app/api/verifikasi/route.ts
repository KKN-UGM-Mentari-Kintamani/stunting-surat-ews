/* src/app/api/verifikasi/route.ts
 * Public document authenticity check (PRD §4.3). Calls the SECURITY DEFINER
 * fn_verifikasi_surat(kode) which returns ONLY minimal info with a masked
 * name — never NIK/KK/address. No user session required.
 */
import { NextRequest, NextResponse } from "next/server";

import { createServiceClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const kode = request.nextUrl.searchParams.get("kode");
  if (!kode || kode.length < 4 || kode.length > 16) {
    return NextResponse.json(
      { ok: false, error: "Kode verifikasi tidak valid." },
      { status: 400 },
    );
  }

  // fn_verifikasi_surat is SECURITY DEFINER and granted to `authenticated` only.
  // This is a public route (no session) → use the service client, which bypasses
  // RLS. The function itself returns ONLY minimal masked info — never NIK/KK.
  const supabase = createServiceClient();
  const { data, error } = await supabase.rpc("fn_verifikasi_surat", {
    kode: kode.toUpperCase(),
  });

  if (error) {
    console.error("[verifikasi] rpc failed:", error.message);
    return NextResponse.json(
      { ok: false, error: "Gagal memverifikasi." },
      { status: 500 },
    );
  }
  if (!data || data.length === 0) {
    return NextResponse.json(
      { ok: false, error: "Kode Tidak Ditemukan." },
      { status: 404 },
    );
  }
  return NextResponse.json({ ok: true, data: data[0] });
}

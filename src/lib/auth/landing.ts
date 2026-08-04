/* src/lib/auth/landing.ts
 * Server-only helpers for role-based landing redirects (PRD §6 / Master §1).
 * After login (or when an already-authenticated user hits a login/public page),
 * the app sends admins/cadres straight to their dashboard instead of the
 * citizen-facing home.
 */
import { createServiceClient } from "@/lib/supabase/server";

export type AppRole = "warga" | "kader_kesehatan" | "admin_desa";

/**
 * Resolve the path a signed-in user should land on, given their role.
 * Admins/cadres go to their own dashboard; citizens honor `next` (validated
 * same-origin) or the home page.
 */
export function landingPathFor(
  role: string | null | undefined,
  next?: string | null,
): string {
  if (role === "admin_desa") return "/admin/surat";
  if (role === "kader_kesehatan") return "/admin/kesehatan";
  if (next && next.startsWith("/") && !next.startsWith("//")) return next;
  return "/";
}

/** Look up the user's app role via the service client (bypasses RLS). */
export async function fetchRoleByUserId(userId: string): Promise<AppRole | null> {
  try {
    const supabase = createServiceClient();
    const { data, error } = await supabase
      .from("users")
      .select("role")
      .eq("id", userId)
      .is("deleted_at", null)
      .maybeSingle();
    if (error || !data) return null;
    return (data.role as AppRole) ?? null;
  } catch (err) {
    console.error("[auth/landing] fetchRoleByUserId failed:", err);
    return null;
  }
}

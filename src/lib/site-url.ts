/* src/lib/site-url.ts
 * Resolves the canonical site base URL for SEO (sitemap.xml, robots.txt,
 * canonical links). Priority: NEXT_PUBLIC_SITE_URL → Vercel production URL →
 * localhost fallback (dev).
 */
export function siteUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL;
  if (explicit) return explicit.replace(/\/$/, "");
  // Vercel provides this only in production previews/deploys.
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) {
    return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
  }
  return "http://localhost:3000";
}

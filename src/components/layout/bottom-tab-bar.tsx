"use client";

/* src/components/layout/bottom-tab-bar.tsx
 * Mobile chrome (Design §3.3): slim brand header on top + bottom tab bar.
 * Replaces the hamburger menu for discoverability. Icon + label always visible,
 * ≥44px tap targets. Hidden at md+ where the desktop Navbar takes over.
 * Entirely suppressed on /admin/* (dashboards manage their own chrome).
 */
import Link from "next/link";
import { usePathname } from "next/navigation";

import { BrandLogo } from "@/components/brand/brand-logo";
import { NAV_ITEMS } from "@/lib/navigation";
import { cn } from "@/lib/utils";

function isActive(pathname: string, href: string): boolean {
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}

export function BottomTabBar() {
  const pathname = usePathname();
  // Admin/cadre dashboards manage their own chrome — hide citizen nav there.
  if (pathname.startsWith("/admin")) return null;
  // Auth pages stay clean — no chrome on /login & /reset-password.
  if (pathname === "/login" || pathname === "/reset-password") return null;
  const items = NAV_ITEMS.filter((i) => i.enabled);

  return (
    <>
      {/* Slim mobile brand header (bottom tab bar carries navigation). */}
      <header className="flex h-14 items-center border-b border-border bg-background px-5 md:hidden">
        <Link href="/" className="flex items-center" aria-label="Sigap Desa — beranda">
          <BrandLogo size="sm" />
        </Link>
      </header>

      <nav
        aria-label="Navigasi utama"
        className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/95 backdrop-blur-sm md:hidden"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <ul className="mx-auto flex max-w-[1120px] items-stretch justify-around">
          {items.map((item) => {
            const active = isActive(pathname, item.href);
            const Icon = item.icon;
            return (
              <li key={item.href} className="flex-1">
                <Link
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "flex min-h-14 flex-col items-center justify-center gap-1 py-2 text-[12px] font-medium outline-offset-[-2px] focus-visible:outline-2 focus-visible:outline-ring",
                    active ? "text-primary" : "text-muted-foreground",
                  )}
                >
                  <Icon
                    className="size-6"
                    strokeWidth={1.5}
                    aria-hidden
                  />
                  {item.shortLabel}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </>
  );
}

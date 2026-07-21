"use client";

/* src/components/layout/navbar.tsx
 * Desktop top navbar (Design §3.3). Hidden below the md breakpoint where the
 * BottomTabBar takes over. Renders from NAV_ITEMS (data-driven, Phase-2-ready).
 */
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown, LogOut, Sprout } from "lucide-react";

import { signOutAction } from "@/lib/auth/actions";
import { NAV_ITEMS, roleMenuFor } from "@/lib/navigation";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export interface NavbarUser {
  name: string;
  email: string;
  role: string;
}

function initialsOf(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join("");
}

function isActive(pathname: string, href: string): boolean {
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}

export function Navbar({ user }: { user: NavbarUser | null }) {
  const pathname = usePathname();
  // Left group: primary navigation only (Profile is excluded — it lives with auth).
  const leftItems = NAV_ITEMS.filter(
    (i) => i.enabled && i.primary !== false,
  );

  function navLinkClasses(href: string): string {
    const active = isActive(pathname, href);
    return cn(
      "flex h-11 items-center rounded-md px-3 text-[15px] font-medium transition-colors outline-offset-4 focus-visible:outline-2 focus-visible:outline-ring",
      active
        ? "bg-accent text-accent-foreground"
        : "text-muted-foreground hover:bg-muted hover:text-foreground",
    );
  }

  return (
    <header className="sticky top-0 z-40 hidden border-b border-border bg-background/95 backdrop-blur-sm md:block">
      <div className="mx-auto flex h-16 w-full max-w-[1120px] items-center gap-6 px-8">
        {/* Left group: brand + primary navigation. */}
        <div className="flex items-center gap-6">
          <Link
            href="/"
            className="flex items-center gap-2 rounded-sm outline-offset-4 focus-visible:outline-2 focus-visible:outline-ring"
            aria-label="Portal Desa — kembali ke beranda"
          >
            <span className="flex size-9 items-center justify-center rounded-md bg-primary text-primary-foreground">
              <Sprout className="size-5" strokeWidth={1.5} aria-hidden />
            </span>
            <span className="font-display text-lg font-semibold text-foreground">
              Portal Desa
            </span>
          </Link>

          <nav aria-label="Navigasi utama" className="flex items-center gap-1">
            {leftItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                aria-current={isActive(pathname, item.href) ? "page" : undefined}
                className={navLinkClasses(item.href)}
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>

        {/* Right group: profile link + account menu, or "Masuk" for guests. */}
        <div className="ml-auto flex items-center gap-2">
          {user ? (
            <>
              <Link
                href="/profil"
                aria-current={isActive(pathname, "/profil") ? "page" : undefined}
                className={navLinkClasses("/profil")}
              >
                Profil Saya
              </Link>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="gap-2 px-2">
                    <Avatar className="size-8">
                      <AvatarFallback className="bg-primary/10 text-xs font-semibold text-primary">
                        {initialsOf(user.name) || "W"}
                      </AvatarFallback>
                    </Avatar>
                    <span className="max-w-32 truncate text-[15px]">
                      {user.name}
                    </span>
                    <ChevronDown className="size-4 text-muted-foreground" aria-hidden />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel className="flex flex-col gap-0.5">
                    <span className="truncate font-medium">{user.name}</span>
                    <span className="truncate text-xs font-normal text-muted-foreground">
                      {user.email}
                    </span>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuGroup>
                    <DropdownMenuItem asChild>
                      <Link href="/profil">Profil Saya</Link>
                    </DropdownMenuItem>
                    {roleMenuFor(user.role).map((m) => (
                      <DropdownMenuItem key={m.href} asChild>
                        <Link href={m.href}>{m.label}</Link>
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuGroup>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    variant="destructive"
                    onSelect={() => void signOutAction()}
                  >
                    <LogOut aria-hidden />
                    Keluar
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          ) : (
            <Button asChild>
              <Link href="/login">Masuk</Link>
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}

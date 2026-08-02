/* src/lib/navigation.ts
 * Single source of truth for portal navigation (PRD §4.1 + Master Doc §2).
 *
 * Why data-driven (PRD §4.1 implementation recommendation): Phase 2's
 * "Layanan Surat" menu becomes visible by flipping `enabled`, not by
 * editing Navbar/BottomTabBar JSX. Both desktop & mobile navs render from
 * this same array, so the two can never drift out of sync.
 */
import {
  BookOpen,
  FileText,
  Sprout,
  UserRound,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  href: string;
  /** Short label for the mobile bottom tab bar. */
  shortLabel: string;
  /** Full label for the desktop navbar. */
  label: string;
  icon: LucideIcon;
  /**
   * `authOnly` items render in the desktop navbar's right group only for
   * logged-in users — guests never see them (Design §3.3: Profile lives with
   * the auth block, not the main menu). The mobile bottom tab bar still shows
   * the item to everyone as a standalone tab.
   */
  authOnly?: boolean;
  /**
   * Feature gate: items stay hidden until their phase ships.
   * Phase 2 sets `layanan-surat` → true (Master Doc §2).
   */
  enabled: boolean;
}

export const NAV_ITEMS: NavItem[] = [
  {
    href: "/",
    shortLabel: "Kalkulator",
    label: "Kalkulator Stunting",
    icon: Sprout,
    enabled: true,
  },
  {
    href: "/edukasi",
    shortLabel: "Edukasi",
    label: "Edukasi & MPASI",
    icon: BookOpen,
    enabled: true,
  },
  {
    // Phase 2 — active (Master Doc §2).
    href: "/layanan-surat",
    shortLabel: "Surat",
    label: "Layanan Surat",
    icon: FileText,
    enabled: true,
  },
  {
    href: "/profil",
    shortLabel: "Profil",
    label: "Profil Saya",
    icon: UserRound,
    authOnly: true, // desktop: appears only for logged-in users
    enabled: true,
  },
];

/** Hidden role-based menus, surfaced inside the Profile dropdown (Design §3.3). */
export interface RoleMenuItem {
  href: string;
  label: string;
}

export function roleMenuFor(role: string | null): RoleMenuItem[] {
  if (role === "kader_kesehatan") {
    return [{ href: "/admin/kesehatan", label: "Dasbor Posyandu" }];
  }
  if (role === "admin_desa") {
    // Reserved since Phase 1 (Master Doc §1); route ships in Phase 2.
    return [{ href: "/admin/surat", label: "Dasbor Admin Surat" }];
  }
  return [];
}

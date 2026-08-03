/* src/app/profil/_components/profile-tabs.tsx
 * Modular Tabs (PRD §4.2C reserved Phase 2 "Riwayat Surat" tab; Master Doc §2).
 * A feature flag controls visibility — flipping it on in Phase 2 needs no JSX
 * edit, mirroring the data-driven pattern used in the navbar's NAV_ITEMS.
 */
import { BookHeart, Mail } from "lucide-react";

import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { LetterHistory } from "@/app/layanan-surat/_components/letter-history";

const LETTER_TAB_ENABLED = true; // Phase 2 — active

interface TabDef {
  value: string;
  label: string;
  Icon: typeof BookHeart;
  enabled: boolean;
}

const TABS: TabDef[] = [
  {
    value: "growh",
    label: "Riwayat Pertumbuhan Anak",
    Icon: BookHeart,
    enabled: true,
  },
  {
    value: "letters",
    label: "Riwayat Surat",
    Icon: Mail,
    enabled: LETTER_TAB_ENABLED,
  },
];

export function ProfileTabs({ children }: { children: React.ReactNode }) {
  const visible = TABS.filter((t) => t.enabled);

  // When only one tab is active there's nothing to switch between, but we keep
  // the Tabs shell so Phase 2's addition is a flag flip — not a layout rework.
  if (visible.length === 1) {
    return (
      <Tabs defaultValue={visible[0].value} className="w-full">
        <TabsList className="w-fit">
          {visible.map((t) => (
            <TabsTrigger key={t.value} value={t.value} className="gap-1.5">
              <t.Icon className="size-4" strokeWidth={1.5} aria-hidden />
              {t.label}
            </TabsTrigger>
          ))}
        </TabsList>
        <TabsContent value={visible[0].value} className="mt-6">
          {children}
        </TabsContent>
      </Tabs>
    );
  }

  return (
    <Tabs defaultValue={visible[0].value} className="w-full">
      <TabsList>
        {visible.map((t) => (
          <TabsTrigger key={t.value} value={t.value} className="gap-1.5">
            <t.Icon className="size-4" strokeWidth={1.5} aria-hidden />
            {t.label}
          </TabsTrigger>
        ))}
      </TabsList>
      <TabsContent value="growh" className="mt-6">
        {children}
      </TabsContent>
      <TabsContent value="letters" className="mt-6">
        <LetterHistory />
      </TabsContent>
    </Tabs>
  );
}
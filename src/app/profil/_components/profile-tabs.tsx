/* src/app/profil/_components/profile-tabs.tsx
 * Modular Tabs (PRD §4.2C). Dua tab: "Riwayat Surat" (default, di kiri) dan
 * "Lihat Anak" (daftar/profil anak, di kanan). Data-driven via TABS array.
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

// Urutan: Riwayat Surat di kiri (default), Lihat Anak di kanan.
const TABS: TabDef[] = [
  {
    value: "letters",
    label: "Riwayat Surat",
    Icon: Mail,
    enabled: LETTER_TAB_ENABLED,
  },
  {
    value: "growh",
    label: "Lihat Anak",
    Icon: BookHeart,
    enabled: true,
  },
];

export function ProfileTabs({ children }: { children: React.ReactNode }) {
  const visible = TABS.filter((t) => t.enabled);

  // When only one tab is active there's nothing to switch between, but we keep
  // the Tabs shell so additions are a flag flip — not a layout rework.
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
    <Tabs defaultValue="letters" className="w-full">
      <TabsList>
        {visible.map((t) => (
          <TabsTrigger key={t.value} value={t.value} className="gap-1.5">
            <t.Icon className="size-4" strokeWidth={1.5} aria-hidden />
            {t.label}
          </TabsTrigger>
        ))}
      </TabsList>
      <TabsContent value="letters" className="mt-6">
        <LetterHistory />
      </TabsContent>
      <TabsContent value="growh" className="mt-6">
        {children}
      </TabsContent>
    </Tabs>
  );
}

/* src/app/profil/_components/profile-tabs.tsx
 * Modular Tabs (PRD §4.2C / Master Doc §2). Tab "Riwayat Surat" aktif sejak
 * Phase 2; isinya dilempar dari halaman (server) sebagai `letterTab`.
 */
import { BookHeart, Mail } from "lucide-react";

import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";

interface Props {
  children: React.ReactNode; // "Riwayat Pertumbuhan Anak" content
  letterTab?: React.ReactNode; // "Riwayat Surat" content
}

export function ProfileTabs({ children, letterTab }: Props) {
  return (
    <Tabs defaultValue="growh" className="w-full">
      <TabsList className="w-fit">
        <TabsTrigger value="growh" className="gap-1.5">
          <BookHeart className="size-4" strokeWidth={1.5} aria-hidden />
          Riwayat Pertumbuhan Anak
        </TabsTrigger>
        <TabsTrigger value="letters" className="gap-1.5">
          <Mail className="size-4" strokeWidth={1.5} aria-hidden />
          Riwayat Surat
        </TabsTrigger>
      </TabsList>
      <TabsContent value="growh" className="mt-6">
        {children}
      </TabsContent>
      <TabsContent value="letters" className="mt-6">
        {letterTab ?? (
          <p className="text-[15px] text-muted-foreground">
            Riwayat surat Anda akan tampil di sini.
          </p>
        )}
      </TabsContent>
    </Tabs>
  );
}

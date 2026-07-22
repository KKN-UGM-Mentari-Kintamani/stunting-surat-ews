/* src/app/profil/_components/children-section.tsx
 * Lists the citizen's children. Empty state uses shadcn `Empty` (skill rule);
 * otherwise each child renders in a ChildCard with a "Tambah Anak" button
 * sitting above the grid.
 */
import { Plus } from "lucide-react";

import { AddChildDialog } from "@/app/profil/_components/add-child-dialog";
import { ChildCard } from "@/app/profil/_components/child-card";
import { Button } from "@/components/ui/button";
import { Empty, EmptyDescription, EmptyTitle } from "@/components/ui/empty";
import type { ChildWithMeasurements } from "@/app/profil/_queries";

interface Props {
  items: ChildWithMeasurements[];
}

export function ChildrenSection({ items }: Props) {
  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center gap-6 py-10">
        <Empty className="max-w-md text-center">
          <EmptyTitle>Belum ada data anak</EmptyTitle>
          <EmptyDescription>
            Yuk tambah profil anak pertama Anda untuk mulai memantau tumbuh
            kembangnya dan menyimpan hasil kalkulator ke riwayat.
          </EmptyDescription>
        </Empty>
        <AddChildDialog>
          <Button variant="default" className="gap-2">
            <Plus className="size-4" strokeWidth={1.5} aria-hidden />
            Tambah Anak
          </Button>
        </AddChildDialog>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-display text-[22px] leading-[1.25] font-medium">
          Profil Anak
        </h2>
        <AddChildDialog>
          <Button variant="default" className="gap-2">
            <Plus className="size-4" strokeWidth={1.5} aria-hidden />
            Tambah Anak
          </Button>
        </AddChildDialog>
      </div>
      <div className="grid grid-cols-1 gap-5 @2xl:grid-cols-2">
        {items.map((child) => (
          <ChildCard key={child.id} child={child} />
        ))}
      </div>
      {items.length === 1 && (
        <p className="text-center text-[13px] text-muted-foreground">
          Tambahkan satu anak lagi agar dapat membandingkan pola tumbuh kembangnya.
        </p>
      )}
    </div>
  );
}
"use client";

/* src/app/edukasi/_components/directory-filters.tsx
 * Filter chips — ToggleGroup for the 5 PRD age buckets and 2 content types.
 * Mobile: chips scroll horizontally in a single row. Desktop: they wrap.
 */
import { BookOpenText, CookingPot } from "lucide-react";

import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { AGE_BUCKET_LABEL, type AgeBucket } from "@/lib/calc/lms";

interface Props {
  selectedAge: string | null;
  onAgeChange: (val: string | null) => void;
  selectedType: string | null;
  onTypeChange: (val: string | null) => void;
}

const BUCKETS: AgeBucket[] = ["0-6", "6-8", "9-11", "12-24", "24-60"];

const TYPE_MAP = [
  { value: "artikel_gizi", short: "Artikel", Icon: BookOpenText },
  { value: "resep_mpasi", short: "Resep", Icon: CookingPot },
] as const;

export function DirectoryFilters({
  selectedAge,
  onAgeChange,
  selectedType,
  onTypeChange,
}: Props) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <span className="text-[13px] font-medium text-muted-foreground">
          Usia
        </span>
        <ToggleGroup
          type="single"
          value={selectedAge ?? ""}
          onValueChange={(v) => onAgeChange(v || null)}
          className="flex-wrap justify-start gap-1.5"
        >
          <ToggleGroupItem
            value=""
            onClick={() => onAgeChange(null)}
            data-active={selectedAge === null}
            variant="outline"
            className="h-9 px-3 text-[14px]"
          >
            Semua usia
          </ToggleGroupItem>
          {BUCKETS.map((b) => (
            <ToggleGroupItem
              key={b}
              value={b}
              variant="outline"
              className="h-9 px-3 text-[14px]"
            >
              {AGE_BUCKET_LABEL[b]}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      </div>

      <div className="flex flex-col gap-2">
        <span className="text-[13px] font-medium text-muted-foreground">
          Jenis
        </span>
        <ToggleGroup
          type="single"
          value={selectedType ?? ""}
          onValueChange={(v) => onTypeChange(v || null)}
          className="flex-wrap justify-start gap-1.5"
        >
          <ToggleGroupItem
            value=""
            onClick={() => onTypeChange(null)}
            data-active={selectedType === null}
            variant="outline"
            className="h-9 gap-1.5 px-3 text-[14px]"
          >
            Semua
          </ToggleGroupItem>
          {TYPE_MAP.map(({ value, short, Icon }) => (
            <ToggleGroupItem
              key={value}
              value={value}
              variant="outline"
              className="h-9 gap-1.5 px-3 text-[14px]"
            >
              <Icon className="size-3.5" strokeWidth={1.5} aria-hidden />
              {short}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      </div>
    </div>
  );
}
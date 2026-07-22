"use client";

/* src/app/profil/_components/child-card.tsx
 * Card per anak: nama, umur sekarang, gender chip, status hasil terakhir,
 * tombol reveal chart + tabel riwayat (Collapsible inline agar ringan untuk
 * low-end), dan tombol "Catat Pengukuran Baru" yang membuka measurement dialog.
 * Anak >60 bln tetap tampil, tapi catat/simpan dinonaktifkan dengan label.
 *
 * The growth chart is React.lazy-loaded so chart.js + WHO reference arrays
 * only download for users who actually open a history view (AGENTS.md low-end
 * empathy): default bundle stays light.
 */
import { Suspense, lazy, useState } from "react";
import { ChevronDown, History, Ruler } from "lucide-react";

import {
  dbGenderToUi,
  dbStatusToUi,
  type Gender,
} from "@/lib/calc/lms";
import { cn } from "@/lib/utils";
import type {
  ChildWithMeasurements,
  MeasurementRow,
} from "@/app/profil/_queries";
import { MeasurementDialog } from "@/app/profil/_components/measurement-dialog";
import { MeasurementTable } from "@/app/profil/_components/measurement-table";
import { StatusBadge } from "@/components/calculator/status-badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Skeleton } from "@/components/ui/skeleton";

const GrowthChart = lazy(() =>
  import("@/components/profil/growth-chart").then((m) => ({ default: m.GrowthChart })),
);

interface Props {
  child: ChildWithMeasurements;
}

function genderWord(jk: "L" | "P"): string {
  return jk === "L" ? "Laki-laki" : "Perempuan";
}

export function ChildCard({ child }: Props) {
  const [open, setOpen] = useState(false);
  const [measureOpen, setMeasureOpen] = useState(false);

  const last = child.measurements[child.measurements.length - 1] as
    | MeasurementRow
    | undefined;

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex flex-col gap-1">
            <CardTitle className="leading-snug">{child.nama_anak}</CardTitle>
            <p className="text-[15px] text-muted-foreground">
              {genderWord(child.jenis_kelamin)} ·{" "}
              <span className="tabular-data">{child.ageMonthsNow}</span> bulan
            </p>
            {!child.inRange && (
              <p className="text-[13px] text-muted-foreground">
                Sudah di luar rentang WHO (0–60 bulan) — pantau via Posyandu.
              </p>
            )}
          </div>
          {last && (
            <StatusBadge status={dbStatusToUi(last.status_hasil)} />
          )}
        </div>
      </CardHeader>

      <CardContent className="flex flex-col gap-4">
        {last ? (
          <p className="text-[15px] leading-relaxed text-muted-foreground">
            Pengukuran terakhir{" "}
            <span className="tabular-data">
              {new Date(last.tanggal_ukur).toLocaleDateString("id-ID", {
                day: "numeric",
                month: "short",
                year: "numeric",
              })}
            </span>{" "}
            — berat{" "}
            <span className="tabular-data font-medium">
              {Number(last.berat_badan_kg).toLocaleString("id-ID")} kg
            </span>
            , tinggi{" "}
            <span className="tabular-data font-medium">
              {Number(last.tinggi_badan_cm).toLocaleString("id-ID")} cm
            </span>
            .
          </p>
        ) : (
          <p className="text-[15px] leading-relaxed text-muted-foreground">
            Belum ada pengukuran tersimpan.
          </p>
        )}

        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="default"
            size="sm"
            className="gap-1.5"
            disabled={!child.inRange}
            onClick={() => setMeasureOpen(true)}
          >
            <Ruler className="size-4" strokeWidth={1.5} aria-hidden />
            Catat Pengukuran Baru
          </Button>
          {child.measurements.length > 0 && (
            <Collapsible open={open} onOpenChange={setOpen}>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="sm" className="gap-1.5">
                  <History className="size-4" strokeWidth={1.5} aria-hidden />
                  Lihat Riwayat
                  <ChevronDown
                    className={cn(
                      "size-4 transition-transform",
                      open && "rotate-180",
                    )}
                    aria-hidden
                  />
                </Button>
              </CollapsibleTrigger>

              <CollapsibleContent className="mt-4 flex flex-col gap-4 data-[state=open]:animate-result-reveal">
                <Suspense
                  fallback={
                    <Skeleton className="h-[320px] w-full rounded-md" />
                  }
                >
                  <GrowthChart
                    gender={dbGenderToUi(child.jenis_kelamin) as Gender}
                    data={child.measurements.map((m) => ({
                      x: m.umur_bulan,
                      y: Number(m.tinggi_badan_cm),
                    }))}
                  />
                </Suspense>
                <MeasurementTable rows={child.measurements} />
              </CollapsibleContent>
            </Collapsible>
          )}
        </div>
      </CardContent>

      {child.inRange && (
        <MeasurementDialog
          childId={child.id}
          childName={child.nama_anak}
          open={measureOpen}
          onOpenChange={setMeasureOpen}
        />
      )}
    </Card>
  );
}
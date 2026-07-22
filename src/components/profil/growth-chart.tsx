"use client";

/* src/components/profil/growth-chart.tsx
 * Graf riwayat tumbuh anak menggunakan Chart.js + react-chartjs-2 (PRD §4.2C
 * & §5.4 — BUKAN Recharts / shadcn Chart wrapper). Implementasi optimasi low
 * end: dataset `[{x,y}]` numerik, `parsing: false`, `animation: false`,
 * plugin Decimation (aktif di atas 50 titik). Linear scale di sumbu-x (umur
 * dalam bulan) — tidak perlu adapter tanggal (bundle ringan).
 *
 * Kurva acuan WHO (median, −2 SD, +2 SD) digambar dari `who-zscores.json`
 * lewat `valueAtZ(getLmsByAge("lhfa", gender, m), ±2)` per bulan 0–60 —
 * memenuhi PRD yang minta "WHO reference Z-score line as background".
 */
import { useMemo } from "react";
import { Line } from "react-chartjs-2";
import {
  Chart as ChartJS,
  Decimation,
  Legend,
  LineController,
  LineElement,
  LinearScale,
  PointElement,
  Tooltip,
  Filler,
} from "chart.js";

import {
  MAX_AGE_MONTHS,
  MIN_AGE_MONTHS,
  valueAtZ,
  getLmsByAge,
  type Gender,
} from "@/lib/calc/lms";

ChartJS.register(
  LineController,
  LineElement,
  PointElement,
  LinearScale,
  Tooltip,
  Legend,
  Decimation,
  Filler,
);

type Pt = { x: number; y: number };

interface Props {
  gender: Gender;
  data: Pt[];
}

/** Precompute WHO reference height curves 0–60 months for this gender */
function whoReference(gender: Gender) {
  const median: Pt[] = [];
  const pos2sd: Pt[] = [];
  const neg2sd: Pt[] = [];
  for (let m = MIN_AGE_MONTHS; m <= MAX_AGE_MONTHS; m++) {
    const p = getLmsByAge("lhfa", gender, m);
    if (!p) continue;
    median.push({ x: m, y: valueAtZ(p, 0) });
    pos2sd.push({ x: m, y: valueAtZ(p, 2) });
    neg2sd.push({ x: m, y: valueAtZ(p, -2) });
  }
  return { median, pos2sd, neg2sd };
}

export function GrowthChart({ gender, data }: Props) {
  const ref = useMemo(() => whoReference(gender), [gender]);
  // Child points must be sorted ascending by x (required by parsing:false +
  // decimation). Defensive copy so the plugin can mutate internally.
  const childSorted = useMemo(
    () => [...data].sort((a, b) => a.x - b.x),
    [data],
  );

  const chartData = {
    datasets: [
      {
        label: "+2 SD (WHO)",
        data: ref.pos2sd,
        borderColor: "rgba(47, 107, 79, 0.25)" /* --growth-green 25% */,
        backgroundColor: "transparent",
        borderWidth: 1,
        borderDash: [4, 4],
        pointRadius: 0,
        tension: 0.3,
      },
      {
        label: "Median WHO",
        data: ref.median,
        borderColor: "rgba(47, 107, 79, 0.55)",
        backgroundColor: "transparent",
        borderWidth: 1.5,
        borderDash: [2, 3],
        pointRadius: 0,
        tension: 0.3,
      },
      {
        label: "−2 SD (WHO)",
        data: ref.neg2sd,
        borderColor: "rgba(47, 107, 79, 0.25)",
        backgroundColor: "transparent",
        borderWidth: 1,
        borderDash: [4, 4],
        pointRadius: 0,
        tension: 0.3,
      },
      {
        label: "Tinggi si kecil",
        data: childSorted,
        borderColor: "rgba(53, 82, 110, 1)" /* --official-blue */,
        backgroundColor: "rgba(53, 82, 110, 0.1)",
        borderWidth: 2,
        pointRadius: 3.5,
        pointBackgroundColor: "rgba(53, 82, 110, 1)",
        tension: 0.25,
        fill: false,
      },
    ],
  };

  return (
    <div className="h-[320px] w-full rounded-md border border-border bg-card p-3">
      <Line
        data={chartData}
        options={{
          responsive: true,
          maintainAspectRatio: false,
          animation: false, // PRD §5.4
          parsing: false, // data already {x,y}; PRD §5.4
          plugins: {
            legend: {
              position: "top",
              labels: {
                boxWidth: 18,
                boxHeight: 2,
                color: "rgba(43, 40, 35, 0.7)",
                font: { size: 12 },
              },
            },
            tooltip: {
              mode: "nearest",
              intersect: false,
              callbacks: {
                title: (items) => `Usia ${items[0]?.parsed.x} bln`,
                label: (item) =>
                  `${item.dataset.label}: ${Number(item.parsed.y ?? 0).toFixed(1)} cm`,
              },
            },
            decimation: {
              enabled: true,
              threshold: 50, // PRD §5.4
              algorithm: "lttb",
              samples: 50,
            },
          },
          interaction: { mode: "nearest", axis: "x", intersect: false },
          scales: {
            x: {
              type: "linear",
              min: MIN_AGE_MONTHS,
              max: MAX_AGE_MONTHS,
              title: {
                display: true,
                text: "Usia (bulan)",
                color: "rgba(43, 40, 35, 0.7)",
                font: { size: 12 },
              },
              ticks: {
                color: "rgba(43, 40, 35, 0.7)",
                maxRotation: 0,
                autoSkip: true,
              },
            },
            y: {
              title: {
                display: true,
                text: "Tinggi badan (cm)",
                color: "rgba(43, 40, 35, 0.7)",
                font: { size: 12 },
              },
              ticks: { color: "rgba(43, 40, 35, 0.7)" },
            },
          },
        }}
      />
    </div>
  );
}

export type { Pt as Point };
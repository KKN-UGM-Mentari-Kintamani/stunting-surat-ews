/* src/components/calculator/targets-card.tsx
 * "Targets & Next Steps" card (Design §6.4 / PRD §4.2A). Shows the child's
 * concrete WHO-median-derived targets (±1 SD) and steps whose tone matches the
 * status — never scary ("Go to the doctor immediately") for high risk, instead
 * supportive ("Let's get the best support at Posyandu"). A small Growth Line
 * motif anchors it as the one signature element per result.
 */
import { Sprout } from "lucide-react";

import type { Assessment, Gender, StuntingStatus } from "@/lib/calc/lms";
import { cn } from "@/lib/utils";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

interface Props {
  assessment: Assessment;
  ageMonths: number;
  gender: Gender;
}

function fmt(n: number, digits = 1): string {
  return n.toLocaleString("id-ID", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

function genderWord(g: Gender): string {
  return g === "male" ? "laki-laki" : "perempuan";
}

function stepsFor(status: StuntingStatus): {
  title: string;
  body: string;
}[] {
  if (status === "normal") {
    return [
      {
        title: "Pertahankan pola makan",
        body: "Berat & tinggi si kecil masih dalam rentang ideal. Lanjutkan ASI/MPASI sesuai usia dan rutin kontrol ke Posyandu.",
      },
      {
        title: "Pantau tiap bulan",
        body: "Catat hasil pengukuran berikutnya untuk memastikan tren tumbuh kembang tetap baik.",
      },
    ];
  }
  if (status === "mild") {
    return [
      {
        title: "Padatkan gizi dari MPASI",
        body: "Sesuaikan porsi dengan resep MPASI yang direkomendasikan di bawah — pilih yang sesuai usia si kecil.",
      },
      {
        title: "Kunjungi Posyandu berkala",
        body: "Ajak si kecil ke Posyandu tiap bulan untuk memantau perubahan berat & tinggi.",
      },
    ];
  }
  return [
    {
      title: "Yuk dampingan di Posyandu/Puskesmas",
      body: "Agar si kecil mendapat pendampingan terbaik, kunjungi Posyandu atau Puskesmas terdekat bersama catatan pengukuran ini.",
    },
    {
      title: "Ikuti saran tenaga kesehatan",
      body: "Tim Posyandu akan menyusun rencana asuhan gizi sesuai kondisi si kecil — tidak perlu khawatir, ini langkah awal yang baik.",
    },
  ];
}

const statusTone: Record<StuntingStatus, string> = {
  normal: "text-status-normal-fg",
  mild: "text-status-mild-fg",
  high: "text-status-high-fg",
};

export function TargetsCard({ assessment, ageMonths, gender }: Props) {
  const [wLo, wHi] = assessment.idealWeightKg;
  const [hLo, hHi] = assessment.idealHeightCm;
  const steps = stepsFor(assessment.status);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sprout
            className={cn("size-5", statusTone[assessment.status])}
            strokeWidth={1.5}
            aria-hidden
          />
          Target &amp; Langkah Selanjutnya
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-5">
        <p className="text-[15px] leading-relaxed text-foreground">
          Rentang ideal untuk anak {genderWord(gender)} usia{" "}
          <span className="tabular-data font-medium">
            {ageMonths}
          </span>{" "}
          bulan:
        </p>

        <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="rounded-sm bg-muted px-4 py-3">
            <dt className="text-[13px] text-muted-foreground">
              Berat badan ideal
            </dt>
            <dd className="tabular-data mt-1 text-[16px] font-medium">
              {fmt(wLo)} – {fmt(wHi)} kg
            </dd>
          </div>
          <div className="rounded-sm bg-muted px-4 py-3">
            <dt className="text-[13px] text-muted-foreground">
              Tinggi badan ideal
            </dt>
            <dd className="tabular-data mt-1 text-[16px] font-medium">
              {fmt(hLo)} – {fmt(hHi)} cm
            </dd>
          </div>
        </dl>

        <ol className="targets-steps flex flex-col gap-4">
          {steps.map((step, i) => (
            <li key={i} className="relative pl-8">
              <p className="text-[15px] font-semibold leading-snug">
                {step.title}
              </p>
              <p className="mt-0.5 text-[15px] leading-relaxed text-muted-foreground">
                {step.body}
              </p>
            </li>
          ))}
        </ol>
        <style>{`
          .targets-steps{counter-reset:steps}
          .targets-steps li{counter-increment:steps}
          .targets-steps li::before{
            content:counter(steps);
            position:absolute;left:0;top:0;
            display:flex;align-items:center;justify-content:center;
            width:1.5rem;height:1.5rem;border-radius:9999px;
            background:color-mix(in oklch,var(--color-primary) 10%,transparent);
            color:var(--color-primary);font-size:13px;font-weight:600;
          }
        `}</style>
      </CardContent>
    </Card>
  );
}
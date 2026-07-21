/* src/components/calculator/clinical-accordion.tsx
 * "Clinical Details" accordion — kept separate & collapsed by default (PRD
 * §4.2A) so the parent UI stays calm. Surfaces exact Z-scores + WHO medians,
 * including the optional hcfa/acfa screenings a kader may have entered.
 */
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import type { Assessment, Gender } from "@/lib/calc/lms";

interface Props {
  assessment: Assessment;
  ageMonths: number;
  gender: Gender;
}

function fmt(n: number, digits = 2): string {
  const s = n.toFixed(digits);
  return s.replace("-", "−"); // typographic minus for clinical readability
}

function Row({
  label,
  z,
  note,
}: {
  label: string;
  z: number | null;
  note?: string;
}) {
  return (
    <tr className="odd:bg-muted/40">
      <th
        scope="row"
        className="px-4 py-3 text-left text-[15px] font-normal text-foreground"
      >
        {label}
      </th>
      <td className="tabular-data px-4 py-3 text-right text-[16px] font-medium">
        {z === null ? "—" : fmt(z)}
      </td>
      <td className="px-4 py-3 text-right text-[13px] text-muted-foreground">
        {note}
      </td>
    </tr>
  );
}

export function ClinicalAccordion({ assessment, ageMonths, gender }: Props) {
  return (
    <Accordion type="single" collapsible className="w-full">
      <AccordionItem value="clinical">
        <AccordionTrigger className="text-[15px] font-medium">
          Rincian klinis (untuk tenaga kesehatan)
        </AccordionTrigger>
        <AccordionContent>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[360px] border-collapse text-left">
              <thead>
                <tr className="text-[13px] text-muted-foreground">
                  <th className="px-4 py-2 font-normal">Indikator</th>
                  <th className="px-4 py-2 text-right font-normal">Z-score</th>
                  <th className="px-4 py-2 text-right font-normal">Median WHO</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                <Row
                  label="Berat badan menurut usia (WFA)"
                  z={assessment.zWfa}
                  note={`${fmt(assessment.medians.wfa, 1)} kg`}
                />
                <Row
                  label="Tinggi/panjang menurut usia (LHFA)"
                  z={assessment.zLhfa}
                  note={`${fmt(assessment.medians.lhfa, 1)} cm`}
                />
                <Row
                  label="IMT menurut usia (BMI)"
                  z={assessment.zBmi}
                  note={`${fmt(assessment.medians.bmi, 1)} kg/m²`}
                />
                <Row
                  label="Berat menurut tinggi (WFH/WFL)"
                  z={assessment.zWfh}
                  note={gender === "male" ? "Laki-laki" : "Perempuan"}
                />
                {assessment.zHcfa !== null && (
                  <Row
                    label="Lingkar kepala menurut usia (HCFA)"
                    z={assessment.zHcfa}
                    note="opsional"
                  />
                )}
                {assessment.zAcfa !== null && (
                  <Row
                    label="Lingkar lengan atas (ACFA)"
                    z={assessment.zAcfa}
                    note="opsional"
                  />
                )}
              </tbody>
            </table>
          </div>
          <p className="mt-4 text-[13px] leading-relaxed text-muted-foreground">
            Usia saat pengukuran: <span className="tabular-data">{ageMonths}</span>{" "}
            bulan. Z-score WHO 2006 (LMS). Ambang: ≤ −3 risiko tinggi, (−3, −2]
            risiko sedang. Status utama ditentukan oleh WFA/LHFA/BMI; skrining
            opsional tidak memengaruhi hasil utama.
          </p>
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}
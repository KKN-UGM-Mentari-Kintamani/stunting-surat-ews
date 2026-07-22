"use client";

/* src/components/calculator/result-section.tsx
 * Result reveal (Design §7): status badge → targets card → clinical
 * accordion → recommendations, each 150ms fade+slide with 80ms stagger, and
 * respects prefers-reduced-motion (the .animate-result-reveal utility falls
 * back to a no-op under reduced motion).
 */
import type { Assessment, Gender } from "@/lib/calc/lms";
import type { ChildSummary } from "@/app/profil/_queries";
import type { ArticleCardData } from "@/app/edukasi/page";
import { ClinicalAccordion } from "@/components/calculator/clinical-accordion";
import { RecommendationCards } from "@/components/calculator/recommendation-cards";
import {
  SaveFlow,
  type SaveDraft,
} from "@/components/calculator/save-flow";
import {
  StatusBadge,
  StatusHeadline,
} from "@/components/calculator/status-badge";
import { TargetsCard } from "@/components/calculator/targets-card";

interface Props {
  assessment: Assessment;
  ageMonths: number;
  gender: Gender;
  isLoggedIn: boolean;
  anak: ChildSummary[];
  draft: SaveDraft;
  edukasiRecs: Record<string, { artikel_gizi: ArticleCardData[]; resep_mpasi: ArticleCardData[] }>;
  onReset: () => void;
}

function Reveal({
  delay,
  children,
}: {
  delay: number;
  children: React.ReactNode;
}) {
  return (
    <div
      className="animate-result-reveal"
      style={{ animationDelay: `${delay}ms` }}
    >
      {children}
    </div>
  );
}

export function ResultSection({
  assessment,
  ageMonths,
  gender,
  isLoggedIn,
  anak,
  draft,
  edukasiRecs,
  onReset,
}: Props) {
  return (
    <section className="mx-auto flex w-full max-w-[1120px] flex-col gap-6">
      <div className="flex flex-col items-start gap-3">
        <Reveal delay={0}>
          <StatusBadge status={assessment.status} />
        </Reveal>
        <Reveal delay={80}>
          <h2 className="font-display text-[24px] leading-[1.25] font-medium md:text-[28px]">
            <StatusHeadline status={assessment.status} />
          </h2>
        </Reveal>
      </div>

      <Reveal delay={160}>
        <TargetsCard
          assessment={assessment}
          ageMonths={ageMonths}
          gender={gender}
        />
      </Reveal>

      <Reveal delay={240}>
        <ClinicalAccordion
          assessment={assessment}
          ageMonths={ageMonths}
          gender={gender}
        />
      </Reveal>

      {/* Action row sits between clinical details and recommendations, right-aligned. */}
      <Reveal delay={320}>
        <div className="flex flex-wrap items-center justify-end gap-3">
          <button
            type="button"
            onClick={onReset}
            className="text-[15px] font-medium text-secondary underline-offset-4 hover:underline"
          >
            Hitung ulang
          </button>
          <SaveFlow isLoggedIn={isLoggedIn} anak={anak} draft={draft} />
        </div>
      </Reveal>

      <Reveal delay={400}>
        <RecommendationCards ageMonths={ageMonths} edukasiRecs={edukasiRecs} />
      </Reveal>
    </section>
  );
}
/* src/app/edukasi/_components/article-card.tsx
 * Card for the public directory grid. Links to the correct detail route
 * (/edukasi/artikel-gizi/[slug] or /edukasi/resep-mpasi/[slug]) based on
 * the content type field, so slugs can never leak across type boundaries.
 */
import Link from "next/link";
import { BookOpenText, CookingPot, Sprout } from "lucide-react";

import type { ArticleCardData } from "@/app/edukasi/page";
import { AGE_BUCKET_LABEL, type AgeBucket } from "@/lib/calc/lms";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const typeMeta = {
  artikel_gizi: { label: "Artikel", Icon: BookOpenText },
  resep_mpasi: { label: "Resep", Icon: CookingPot },
} as const;

function href(article: ArticleCardData): string {
  const prefix =
    article.tipe_konten === "resep_mpasi"
      ? "/edukasi/resep-mpasi"
      : "/edukasi/artikel-gizi";
  return `${prefix}/${article.slug}`;
}

export function ArticleCard({ article }: { article: ArticleCardData }) {
  const { label, Icon } = typeMeta[article.tipe_konten] ?? typeMeta.artikel_gizi;

  return (
    <Link href={href(article)} className="group">
      <Card className="h-full transition-shadow group-hover:shadow-[0_4px_16px_rgba(43,40,35,0.1)]">
        <div className="flex h-36 items-center justify-center rounded-t-md bg-muted text-muted-foreground">
          {article.thumbnail_url ? (
            <img
              src={article.thumbnail_url}
              alt=""
              className="h-full w-full rounded-t-md object-cover"
              loading="lazy"
            />
          ) : (
            <Sprout
              className="size-10 opacity-30"
              strokeWidth={1}
              aria-hidden
            />
          )}
        </div>
        <CardHeader>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary" className="gap-1">
              <Icon className="size-3" strokeWidth={1.5} aria-hidden />
              {label}
            </Badge>
            <Badge variant="outline" className="text-[13px]">
              {AGE_BUCKET_LABEL[article.kategori_umur as AgeBucket] ??
                article.kategori_umur}
            </Badge>
          </div>
          <CardTitle className="line-clamp-2 text-[18px] leading-[1.3]">
            {article.judul}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <CardDescription className="text-[13px]">
            {new Date(article.created_at).toLocaleDateString("id-ID", {
              day: "numeric",
              month: "short",
              year: "numeric",
            })}
          </CardDescription>
        </CardContent>
      </Card>
    </Link>
  );
}
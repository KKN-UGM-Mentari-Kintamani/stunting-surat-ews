/* src/app/profil/_components/profile-summary.tsx
 * Top-of-page summary (PRD §4.2C): name, email, registered children count.
 * Graf keluarga dihitung hanya untuk child dalam rentang 0–60 bln — anak
 * di luar rentang tetap ada di grid bawah, tapi tidak dihitung "aktif".
 */
import { Sprout } from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

interface Props {
  nama: string;
  email: string;
  childCount: number;
}

export function ProfileSummary({ nama, email, childCount }: Props) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
          <span className="flex size-11 items-center justify-center rounded-md bg-primary/10 text-primary">
            <Sprout className="size-6" strokeWidth={1.5} aria-hidden />
          </span>
          <div className="min-w-0">
            <CardTitle className="truncate">{nama}</CardTitle>
            <CardDescription className="truncate">{email}</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex items-baseline gap-2">
          <span className="tabular-data text-[28px] font-semibold text-foreground">
            {childCount}
          </span>
          <span className="text-[15px] text-muted-foreground">
            anak terdaftar dalam rentang pemantauan
          </span>
        </div>
        <p className="mt-1 text-[13px] text-muted-foreground">
          Rentang WHO 2006: 0–60 bulan (± 5 tahun).
        </p>
      </CardContent>
    </Card>
  );
}
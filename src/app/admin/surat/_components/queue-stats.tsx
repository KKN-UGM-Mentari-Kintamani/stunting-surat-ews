/* src/app/admin/surat/_components/queue-stats.tsx
 * Monitoring cards for the letter queue dashboard: total requests, approved
 * today, and still waiting (no action taken). Stateless — server computes the
 * numbers and renders.
 */
import { CheckCircle2, Clock, Files } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

interface Props {
  total: number;
  approvedToday: number;
  waiting: number;
}

export function QueueStats({ total, approvedToday, waiting }: Props) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-[15px] text-muted-foreground">
            <Files className="size-4 text-primary" strokeWidth={1.5} aria-hidden />
            Total Permohonan
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="tabular-data text-[28px] font-semibold leading-none">
            {total}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-[15px] text-muted-foreground">
            <CheckCircle2 className="size-4 text-status-normal-fg" strokeWidth={1.5} aria-hidden />
            Disetujui Hari Ini
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="tabular-data text-[28px] font-semibold leading-none text-status-normal-fg">
            {approvedToday}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-[15px] text-muted-foreground">
            <Clock className="size-4 text-status-waiting-fg" strokeWidth={1.5} aria-hidden />
            Menunggu Tindakan
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="tabular-data text-[28px] font-semibold leading-none text-status-waiting-fg">
            {waiting}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

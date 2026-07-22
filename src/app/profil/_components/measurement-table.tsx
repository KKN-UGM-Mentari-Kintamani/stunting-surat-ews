/* src/app/profil/_components/measurement-table.tsx
 * Tabel riwayat pengukuran anak. Zebra halus (Design §6.5), numerik tabular
 * (Design §2). Mengecil horisontal aman di layar kecil via w-full min-w.
 */
import { dbStatusToUi } from "@/lib/calc/lms";
import type { MeasurementRow } from "@/app/profil/_queries";
import { StatusBadge } from "@/components/calculator/status-badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

function fmt(n: number | null | undefined, digits = 2): string {
  if (n === null || n === undefined) return "—";
  return n.toLocaleString("id-ID", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

function fmtDate(s: string): string {
  return new Date(s).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

interface Props {
  rows: MeasurementRow[];
}

export function MeasurementTable({ rows }: Props) {
  if (rows.length === 0) {
    return (
      <p className="text-[15px] text-muted-foreground">
        Belum ada pengukuran tersimpan.
      </p>
    );
  }

  // Most recent first for reading rhythm.
  const ordered = [...rows].sort((a, b) => b.umur_bulan - a.umur_bulan);

  return (
    <div className="overflow-x-auto rounded-md border border-border">
      <Table className="min-w-[640px]">
        <TableHeader>
          <TableRow>
            <TableHead>Tanggal ukur</TableHead>
            <TableHead className="text-right">Usia (bln)</TableHead>
            <TableHead className="text-right">Berat (kg)</TableHead>
            <TableHead className="text-right">Tinggi (cm)</TableHead>
            <TableHead className="text-right">Z (BB/U)</TableHead>
            <TableHead className="text-right">Z (TB/U)</TableHead>
            <TableHead>Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {ordered.map((r) => (
            <TableRow key={r.id}>
              <TableCell className="tabular-data text-[15px]">
                {fmtDate(r.tanggal_ukur)}
              </TableCell>
              <TableCell className="tabular-data text-right">
                {r.umur_bulan}
              </TableCell>
              <TableCell className="tabular-data text-right">
                {Number(r.berat_badan_kg).toLocaleString("id-ID")}
              </TableCell>
              <TableCell className="tabular-data text-right">
                {Number(r.tinggi_badan_cm).toLocaleString("id-ID")}
              </TableCell>
              <TableCell className="tabular-data text-right">
                {fmt(r.z_score_bbu)}
              </TableCell>
              <TableCell className="tabular-data text-right">
                {fmt(r.z_score_tbu)}
              </TableCell>
              <TableCell>
                <StatusBadge status={dbStatusToUi(r.status_hasil)} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
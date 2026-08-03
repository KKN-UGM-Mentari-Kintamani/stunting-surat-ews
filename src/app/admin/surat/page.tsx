/* src/app/admin/surat/page.tsx
 * Admin Desa — approval queue (antrian menunggu).
 */
import Link from "next/link";
import { UserCog, UserPlus } from "lucide-react";

import { getApprovalQueueAction, type QueueItem } from "@/app/admin/surat/_actions";
import { ApprovalQueue } from "@/app/admin/surat/_components/approval-queue";
import { Button } from "@/components/ui/button";

export const metadata = { title: "Dasbor Admin Surat" };

export default async function AdminSuratPage() {
  const res = await getApprovalQueueAction("menunggu");
  const queue: QueueItem[] = res.ok ? (res.data ?? []) : [];

  return (
    <div className="flex flex-col gap-8 py-10 md:py-14">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-[28px] leading-[1.15] font-semibold">
            Antrian Persetujuan
          </h1>
          <p className="mt-1 text-[15px] text-muted-foreground">
            Permohonan surat yang menunggu verifikasi.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button asChild variant="outline" className="gap-2">
            <Link href="/admin/surat/walkin">
              <UserPlus className="size-4" strokeWidth={1.5} aria-hidden />
              Buat Walk-In
            </Link>
          </Button>
          <Button asChild variant="outline" className="gap-2">
            <Link href="/admin/surat/config">
              <UserCog className="size-4" strokeWidth={1.5} aria-hidden />
              Konfigurasi Kades
            </Link>
          </Button>
        </div>
      </div>

      <ApprovalQueue initialQueue={queue} />
    </div>
  );
}
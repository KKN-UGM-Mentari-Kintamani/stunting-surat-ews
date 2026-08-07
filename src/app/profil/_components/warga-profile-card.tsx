"use client";

/* src/app/profil/_components/warga-profile-card.tsx
 * Satu card profil gabungan: identitas orang tua (nama utama dari data warga,
 * email dari akun) + seluruh field data warga untuk layanan surat + jumlah anak
 * terdaftar. Tombol "Ubah" membuka dialog form (reuse WargaProfilForm).
 */
import { useState } from "react";
import { Pencil, UserRound } from "lucide-react";
import { toast } from "sonner";

import { WargaProfilForm } from "@/app/layanan-surat/_components/warga-profil-form";
import type { WargaProfilData } from "@/lib/surat/types";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface Props {
  profil: WargaProfilData | null;
  namaAkun: string;
  email: string;
  childCount: number;
}

export function WargaProfileCard({ profil, namaAkun, email, childCount }: Props) {
  const [open, setOpen] = useState(false);
  const namaUtama = profil?.nama?.trim() || namaAkun || "—";
  const lengkap = !!profil;

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="flex size-11 items-center justify-center rounded-md bg-primary/10 text-primary">
              <UserRound className="size-6" strokeWidth={1.5} aria-hidden />
            </span>
            <div className="min-w-0">
              <CardTitle className="truncate leading-snug">{namaUtama}</CardTitle>
              <p className="truncate text-[14px] text-muted-foreground">{email}</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {lengkap ? (
              <span className="inline-flex items-center gap-1.5 rounded-pill bg-status-normal-bg px-3 py-1 text-[13px] font-medium text-status-normal-fg">
                Data surat: Lengkap
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 rounded-pill bg-status-waiting-bg px-3 py-1 text-[13px] font-medium text-status-waiting-fg">
                Data surat: Belum
              </span>
            )}
            <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setOpen(true)}>
              <Pencil className="size-4" strokeWidth={1.5} aria-hidden />
              Ubah
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="flex items-baseline gap-2">
          <span className="tabular-data text-[28px] font-semibold text-foreground">
            {childCount}
          </span>
          <span className="text-[15px] text-muted-foreground">
            anak terdaftar
          </span>
        </div>

        {lengkap ? (
          <dl className="grid grid-cols-1 gap-x-8 gap-y-2 text-[15px] sm:grid-cols-2">
            <div className="flex flex-wrap gap-2"><dt className="text-muted-foreground">NIK:</dt><dd className="tabular-data font-medium">{profil!.nik}</dd></div>
            <div className="flex flex-wrap gap-2"><dt className="text-muted-foreground">No. KK:</dt><dd className="tabular-data">{profil!.no_kk ?? "—"}</dd></div>
            <div className="flex flex-wrap gap-2"><dt className="text-muted-foreground">Nama:</dt><dd className="font-medium">{profil!.nama}</dd></div>
            <div className="flex flex-wrap gap-2"><dt className="text-muted-foreground">TTL:</dt><dd>{profil!.tempat_lahir} / {profil!.tanggal_lahir}</dd></div>
            <div className="flex flex-wrap gap-2"><dt className="text-muted-foreground">Jenis Kelamin:</dt><dd>{profil!.jenis_kelamin === "P" ? "Perempuan" : "Laki-laki"}</dd></div>
            <div className="flex flex-wrap gap-2"><dt className="text-muted-foreground">Agama:</dt><dd>{profil!.agama}</dd></div>
            <div className="flex flex-wrap gap-2"><dt className="text-muted-foreground">Pekerjaan:</dt><dd>{profil!.pekerjaan}</dd></div>
            <div className="flex flex-wrap gap-2 sm:col-span-2"><dt className="text-muted-foreground">Alamat:</dt><dd>{profil!.alamat}</dd></div>
          </dl>
        ) : (
          <p className="text-[14px] leading-relaxed text-muted-foreground">
            Data warga untuk layanan surat belum dilengkapi. Isi lewat menu
            Layanan Surat agar data otomatis terisi pada formulir surat.
          </p>
        )}

        <p className="text-[13px] leading-relaxed text-muted-foreground">
          Perubahan berlaku untuk pengajuan surat berikutnya dan tidak mengubah
          surat yang sudah diterbitkan.
        </p>
      </CardContent>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Ubah Data Warga</DialogTitle>
            <DialogDescription>
              Perbarui data identitas Anda untuk pengajuan surat berikutnya.
            </DialogDescription>
          </DialogHeader>
          <WargaProfilForm
            initial={profil ?? undefined}
            onSaved={() => {
              setOpen(false);
              toast.success("Data warga berhasil diperbarui.");
            }}
          />
        </DialogContent>
      </Dialog>
    </Card>
  );
}

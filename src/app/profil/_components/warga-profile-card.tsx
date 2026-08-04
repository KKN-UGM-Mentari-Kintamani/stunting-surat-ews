"use client";

/* src/app/profil/_components/warga-profile-card.tsx
 * Kartu "Data Warga (untuk Layanan Surat)" di halaman Profil Saya.
 * Read-view default + tombol "Ubah" membuka dialog form (reuse WargaProfilForm).
 * Peringatan snapshot: perubahan berlaku untuk pengajuan berikutnya, tidak
 * mengubah surat yang sudah diterbitkan.
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
  profil: WargaProfilData;
  onSaved: (profil: WargaProfilData) => void;
}

export function WargaProfileCard({ profil, onSaved }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <UserRound className="size-6 text-primary" strokeWidth={1.5} aria-hidden />
            <CardTitle>Data Warga (untuk Layanan Surat)</CardTitle>
          </div>
          <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setOpen(true)}>
            <Pencil className="size-4" strokeWidth={1.5} aria-hidden />
            Ubah
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <dl className="grid grid-cols-1 gap-x-8 gap-y-2 text-[15px] sm:grid-cols-2">
          <div className="flex flex-wrap gap-2"><dt className="text-muted-foreground">NIK:</dt><dd className="tabular-data font-medium">{profil.nik}</dd></div>
          <div className="flex flex-wrap gap-2"><dt className="text-muted-foreground">No. KK:</dt><dd className="tabular-data">{profil.no_kk ?? "—"}</dd></div>
          <div className="flex flex-wrap gap-2"><dt className="text-muted-foreground">Nama:</dt><dd className="font-medium">{profil.nama}</dd></div>
          <div className="flex flex-wrap gap-2"><dt className="text-muted-foreground">TTL:</dt><dd>{profil.tempat_lahir} / {profil.tanggal_lahir}</dd></div>
          <div className="flex flex-wrap gap-2"><dt className="text-muted-foreground">Agama:</dt><dd>{profil.agama}</dd></div>
          <div className="flex flex-wrap gap-2"><dt className="text-muted-foreground">Pekerjaan:</dt><dd>{profil.pekerjaan}</dd></div>
          <div className="flex flex-wrap gap-2 sm:col-span-2"><dt className="text-muted-foreground">Alamat:</dt><dd>{profil.alamat}</dd></div>
        </dl>
        <p className="mt-3 text-[13px] leading-relaxed text-muted-foreground">
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
            initial={profil}
            onSaved={(updated) => {
              setOpen(false);
              onSaved(updated);
              toast.success("Data warga berhasil diperbarui.");
            }}
          />
        </DialogContent>
      </Dialog>
    </Card>
  );
}

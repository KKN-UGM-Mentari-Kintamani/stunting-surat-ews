"use client";

/* src/app/profil/_components/add-child-dialog.tsx
 * Dialog form for adding a child. Supports being opened as a controlled child
 * (via `open`/`onOpenChange`) AND a standalone trigger button — the trigger
 * pattern lets "Tambah Anak" buttons across /profil share one component while
 * the controlled variant lets the Home save-flow deeplink in (?new=1 on /profil
 * auto-opens this dialog).
 */
import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Plus } from "lucide-react";

import { addChildAction } from "@/app/profil/_actions";
import {
  addChildSchema,
  type AddChildValues,
} from "@/lib/calc/profile-schema";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

interface Props {
  /** When provided, renders as a controlled dialog (no trigger button). */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** When true, the standalone trigger button shows no children (controlled use). */
  noTrigger?: boolean;
  children?: React.ReactNode;
}

const labelClass = "text-[15px] font-medium leading-snug";

export function AddChildDialog({
  open: openProp,
  onOpenChange: onOpenChangeProps,
  noTrigger,
  children,
}: Props) {
  const [internalOpen, setInternalOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const isControlled = openProp !== undefined;
  const open = isControlled ? openProp : internalOpen;
  const setOpen = onOpenChangeProps ?? setInternalOpen;

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors, isValid },
  } = useForm<AddChildValues>({
    resolver: zodResolver(addChildSchema),
    mode: "onChange",
    defaultValues: { nama: "", jenisKelamin: undefined, tanggalLahir: "" },
  });

  function onSubmit(values: AddChildValues) {
    setError(null);
    startTransition(async () => {
      const res = await addChildAction(values);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      toast.success("Anak berhasil ditambahkan.");
      reset();
      setOpen(false);
    });
  }

  const trigger =
    !noTrigger && !isControlled ? (
      <DialogTrigger asChild>
        {children ?? (
          <Button variant="default" className="gap-2">
            <Plus className="size-4" strokeWidth={1.5} aria-hidden />
            Tambah Anak
          </Button>
        )}
      </DialogTrigger>
    ) : null;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {trigger}
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Tambah Profil Anak</DialogTitle>
          <DialogDescription>
            Isi nama, jenis kelamin, dan tanggal lahir anak.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} noValidate>
          <FieldGroup>
            <Field data-invalid={!!errors.nama}>
              <FieldLabel htmlFor="nama" className={labelClass}>
                Nama Anak <span className="text-destructive">*</span>
              </FieldLabel>
              <Input
                id="nama"
                placeholder="Contoh: Budi Santoso"
                aria-invalid={!!errors.nama}
                {...register("nama")}
              />
              {errors.nama && <FieldError errors={[errors.nama]} />}
            </Field>

            <Field data-invalid={!!errors.jenisKelamin}>
              <FieldLabel htmlFor="jk" className={labelClass}>
                Jenis Kelamin <span className="text-destructive">*</span>
              </FieldLabel>
              <Select
                value={undefined}
                onValueChange={(v) =>
                  setValue("jenisKelamin", v as "L" | "P", {
                    shouldValidate: true,
                  })
                }
              >
                <SelectTrigger id="jk" aria-invalid={!!errors.jenisKelamin} className="w-full">
                  <SelectValue placeholder="Pilih jenis kelamin" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectItem value="L">Laki-laki</SelectItem>
                    <SelectItem value="P">Perempuan</SelectItem>
                  </SelectGroup>
                </SelectContent>
              </Select>
              {errors.jenisKelamin && (
                <FieldError errors={[errors.jenisKelamin]} />
              )}
            </Field>

            <Field data-invalid={!!errors.tanggalLahir}>
              <FieldLabel htmlFor="tgl" className={labelClass}>
                Tanggal Lahir <span className="text-destructive">*</span>
              </FieldLabel>
              <Input
                id="tgl"
                type="date"
                max={new Date().toISOString().slice(0, 10)}
                aria-invalid={!!errors.tanggalLahir}
                {...register("tanggalLahir")}
              />
              {errors.tanggalLahir && (
                <FieldError errors={[errors.tanggalLahir]} />
              )}
            </Field>

            {(error || (!isValid && isPending)) && (
              <p className="text-[13px] font-normal text-destructive">{error}</p>
            )}
          </FieldGroup>

          <DialogFooter className="mt-6">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setOpen(false)}
              disabled={isPending}
            >
              Batal
            </Button>
            <Button type="submit" disabled={!isValid || isPending}>
              {isPending && <Loader2 className="animate-spin" aria-hidden />}
              Simpan
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
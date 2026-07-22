"use client";

import { useRef, useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, Save } from "lucide-react";

import { createArticleAction, updateArticleAction } from "@/app/admin/kesehatan/_actions";
import { TipTapEditor } from "@/app/admin/kesehatan/_components/tip-tap-editor";
import { ThumbnailUpload } from "@/app/admin/kesehatan/_components/thumbnail-upload";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Field,
  FieldDescription,
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
import { AGE_BUCKET_LABEL } from "@/lib/calc/lms";

const articleFormSchema = z.object({
  judul: z.string().min(3, "Judul minimal 3 karakter."),
  slug: z.string().optional(),
  tipe_konten: z.enum(["artikel_gizi", "resep_mpasi"], { message: "Pilih jenis konten." }),
  kategori_umur: z.enum(["0-6", "6-8", "9-11", "12-24", "24-60"], { message: "Pilih kategori usia." }),
});
type FormValues = z.infer<typeof articleFormSchema>;

interface Props {
  defaultValues?: {
    id?: string;
    judul: string;
    slug: string;
    tipe_konten: "artikel_gizi" | "resep_mpasi";
    kategori_umur: string;
    konten_html: string;
    thumbnail_url: string;
    published: boolean;
  };
  mode: "create" | "edit";
}

const labelClass = "text-[15px] font-medium leading-snug";

export function ArticleForm({ defaultValues, mode }: Props) {
  const [kontenHtml, setKontenHtml] = useState(defaultValues?.konten_html ?? "");
  const [thumbnailUrl, setThumbnailUrl] = useState(defaultValues?.thumbnail_url ?? "");
  const [isPending, start] = useTransition();
  const [actionError, setActionError] = useState<string | null>(null);
  const tipeKontenRef = useRef<HTMLInputElement>(null);
  const kategoriUmurRef = useRef<HTMLInputElement>(null);

  const { register, handleSubmit, setValue, formState: { errors, isValid } } = useForm<FormValues>({
    resolver: zodResolver(articleFormSchema),
    mode: "onChange",
    defaultValues: {
      judul: defaultValues?.judul ?? "",
      tipe_konten: (defaultValues?.tipe_konten as "artikel_gizi" | "resep_mpasi") ?? undefined,
      kategori_umur: (defaultValues?.kategori_umur as "0-6" | "6-8" | "9-11" | "12-24" | "24-60") ?? undefined,
    },
  });

  async function handleClientSubmit(values: FormValues, event?: React.BaseSyntheticEvent) {
    setActionError(null);
    if (!isValid) {
      setActionError("Periksa kembali isian formulir.");
      return;
    }
    const submitter = (event?.nativeEvent as SubmitEvent)?.submitter as HTMLButtonElement | null;
    const willPublish = submitter?.textContent === "Terbitkan";
    start(async () => {
      const fd = new FormData();
      fd.set("judul", values.judul);
      fd.set("tipe_konten", values.tipe_konten);
      fd.set("kategori_umur", values.kategori_umur);
      fd.set("konten_html", kontenHtml);
      fd.set("thumbnail_url", thumbnailUrl);
      if (willPublish) {
        fd.set("published", "true");
      } else if (mode === "create") {
        fd.set("published", "false");
      } else {
        fd.set("published", String(!!defaultValues?.published));
      }
      const res = mode === "create"
        ? await createArticleAction(fd)
        : await updateArticleAction(defaultValues!.id!, fd);
      if (!res.ok) setActionError(res.error);
    });
  }

  return (
    <form onSubmit={handleSubmit(handleClientSubmit)} className="flex flex-col gap-6">
      <input type="hidden" name="konten_html" value={kontenHtml} readOnly />
      <input type="hidden" name="thumbnail_url" value={thumbnailUrl} readOnly />

      <Card>
        <CardHeader><CardTitle>Informasi Konten</CardTitle></CardHeader>
        <CardContent>
          <FieldGroup>
            <Field data-invalid={!!errors.judul}>
              <FieldLabel htmlFor="judul" className={labelClass}>
                Judul <span className="text-destructive">*</span>
              </FieldLabel>
              <Input id="judul" placeholder="Contoh: Resep MPASI Bubur Tim Ayam Jagung"
                aria-invalid={!!errors.judul} {...register("judul")} />
              {errors.judul && <FieldError errors={[errors.judul]} />}
            </Field>

            <div className="grid grid-cols-1 gap-5 @md/field-group:grid-cols-2">
              <Field data-invalid={!!errors.tipe_konten}>
                <FieldLabel htmlFor="tipe_konten" className={labelClass}>
                  Jenis Konten <span className="text-destructive">*</span>
                </FieldLabel>
                <Select
                  defaultValue={defaultValues?.tipe_konten}
                  onValueChange={(v) => {
                    setValue("tipe_konten", v as "artikel_gizi" | "resep_mpasi", { shouldValidate: true });
                    if (tipeKontenRef.current) tipeKontenRef.current.value = v;
                  }}
                >
                  <SelectTrigger id="tipe_konten" aria-invalid={!!errors.tipe_konten} className="w-full">
                    <SelectValue placeholder="Pilih jenis konten" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      <SelectItem value="artikel_gizi">Artikel Gizi</SelectItem>
                      <SelectItem value="resep_mpasi">Resep MPASI</SelectItem>
                    </SelectGroup>
                  </SelectContent>
                </Select>
                <input type="hidden" name="tipe_konten" ref={tipeKontenRef} defaultValue={defaultValues?.tipe_konten ?? ""} />
                {errors.tipe_konten && <FieldError errors={[errors.tipe_konten]} />}
              </Field>

              <Field data-invalid={!!errors.kategori_umur}>
                <FieldLabel htmlFor="kategori_umur" className={labelClass}>
                  Kategori Usia <span className="text-destructive">*</span>
                </FieldLabel>
                <Select
                  defaultValue={defaultValues?.kategori_umur}
                  onValueChange={(v) => {
                    setValue("kategori_umur", v as "0-6" | "6-8" | "9-11" | "12-24" | "24-60", { shouldValidate: true });
                    if (kategoriUmurRef.current) kategoriUmurRef.current.value = v;
                  }}
                >
                  <SelectTrigger id="kategori_umur" aria-invalid={!!errors.kategori_umur} className="w-full">
                    <SelectValue placeholder="Pilih usia" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      {Object.entries(AGE_BUCKET_LABEL).map(([k, label]) => (
                        <SelectItem key={k} value={k}>{label}</SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
                <input type="hidden" name="kategori_umur" ref={kategoriUmurRef} defaultValue={defaultValues?.kategori_umur ?? ""} />
                {errors.kategori_umur && <FieldError errors={[errors.kategori_umur]} />}
              </Field>
            </div>

            <Field>
              <FieldLabel className={labelClass}>Thumbnail</FieldLabel>
              <FieldDescription className="text-[13px] leading-relaxed text-muted-foreground">
                Gambar akan dikompresi otomatis hingga maks. 2MB sebelum diunggah.
              </FieldDescription>
              <div className="mt-2">
                <ThumbnailUpload value={thumbnailUrl} onChange={setThumbnailUrl} />
              </div>
            </Field>
          </FieldGroup>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Isi Konten</CardTitle></CardHeader>
        <CardContent>
          <TipTapEditor content={kontenHtml} onChange={setKontenHtml} />
        </CardContent>
      </Card>

      <CardFooter className="flex flex-wrap items-center justify-between gap-3">
        {actionError && <p className="text-[13px] text-destructive">{actionError}</p>}
        <div className="flex items-center gap-2">
          <Button type="submit" variant="default" className="gap-2" disabled={isPending}>
            {isPending ? <Loader2 className="animate-spin" aria-hidden /> : <Save className="size-4" strokeWidth={1.5} aria-hidden />}
            {mode === "create" ? "Simpan sebagai Draft" : "Simpan Perubahan"}
          </Button>
          <Button type="submit" variant="default" className="gap-2" disabled={isPending}>
            {isPending ? <Loader2 className="animate-spin" aria-hidden /> : null}
            Terbitkan
          </Button>
        </div>
      </CardFooter>
    </form>
  );
}
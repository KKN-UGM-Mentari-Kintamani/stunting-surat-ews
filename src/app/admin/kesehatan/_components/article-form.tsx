"use client";

/* src/app/admin/kesehatan/_components/article-form.tsx
 * Shared form for create / edit. Client-side RHF validates required fields;
 * the server action re-validates (AGENTS.md §2, never trust the client).
 * The TipTap editor content and thumbnail URL are synced into hidden inputs
 * so the native form submit collects them automatically—no manual FormData
 * construction needed, and the form works even with JS disabled (graceful
 * degradation: editor content just becomes the initial HTML).
 */
import { useCallback, useRef, useState, useTransition } from "react";
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
import { Checkbox } from "@/components/ui/checkbox";
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

function toSlug(title: string): string {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

export function ArticleForm({ defaultValues, mode }: Props) {
  const [kontenHtml, setKontenHtml] = useState(defaultValues?.konten_html ?? "");
  const [thumbnailUrl, setThumbnailUrl] = useState(defaultValues?.thumbnail_url ?? "");
  const [published, setPublished] = useState(defaultValues?.published ?? false);
  const [isPending, start] = useTransition();
  const [actionError, setActionError] = useState<string | null>(null);
  // Refs for hidden inputs that sync from Radix Select (Radix doesn't emit native name/value).
  const tipeKontenRef = useRef<HTMLInputElement>(null);
  const kategoriUmurRef = useRef<HTMLInputElement>(null);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isValid },
  } = useForm<FormValues>({
    resolver: zodResolver(articleFormSchema),
    mode: "onChange",
    defaultValues: {
      judul: defaultValues?.judul ?? "",
      slug: defaultValues?.slug ?? "",
      tipe_konten: (defaultValues?.tipe_konten as "artikel_gizi" | "resep_mpasi") ?? undefined,
      kategori_umur: (defaultValues?.kategori_umur as "0-6" | "6-8" | "9-11" | "12-24" | "24-60") ?? undefined,
    },
  });

  const judul = watch("judul");

  // Auto-generate slug from judul (only when slug is empty or untouched).
  const fillSlug = useCallback(() => {
    const currentSlug = (document.getElementById("slug-input") as HTMLInputElement)?.value;
    if (!currentSlug) {
      setValue("slug", toSlug(judul), { shouldValidate: false });
    }
  }, [judul, setValue]);

  return (
    <form
      action={async (formData: FormData) => {
        setActionError(null);
        if (!isValid) {
          setActionError("Periksa kembali isian formulir.");
          return;
        }
        start(async () => {
          const res =
            mode === "create"
              ? await createArticleAction(formData)
              : await updateArticleAction(defaultValues!.id!, formData);
          // On success, the server action redirects. On failure, show error.
          if (!res.ok) setActionError(res.error);
        });
      }}
      // Run client validation first, then submit natively:
      onSubmit={handleSubmit(() => {})}
      className="flex flex-col gap-6"
    >
      {/* Hidden inputs for TipTap editor and thumbnail — synced via state. */}
      <input type="hidden" name="konten_html" value={kontenHtml} readOnly />
      <input type="hidden" name="thumbnail_url" value={thumbnailUrl} readOnly />
      <input type="hidden" name="published" value={published ? "true" : "false"} readOnly />

      <Card>
        <CardHeader>
          <CardTitle>Informasi Konten</CardTitle>
        </CardHeader>
        <CardContent>
          <FieldGroup>
            <Field data-invalid={!!errors.judul}>
              <FieldLabel htmlFor="judul" className={labelClass}>
                Judul <span aria-hidden className="text-destructive">*</span>
              </FieldLabel>
              <Input
                id="judul"
                placeholder="Contoh: Resep MPASI Bubur Tim Ayam Jagung"
                aria-invalid={!!errors.judul}
                {...register("judul")}
                onBlur={() => fillSlug()}
              />
              {errors.judul && <FieldError errors={[errors.judul]} />}
            </Field>

            <Field data-invalid={!!errors.slug}>
              <FieldLabel htmlFor="slug-input" className={labelClass}>
                Slug URL
              </FieldLabel>
              <Input
                id="slug-input"
                placeholder="resep-mpasi-bubur-tim-ayam-jagung"
                aria-invalid={!!errors.slug}
                {...register("slug")}
              />
              <FieldDescription className="text-[13px] leading-relaxed text-muted-foreground">
                Dihasilkan otomatis dari judul. Bisa diubah manual.
              </FieldDescription>
              {errors.slug && <FieldError errors={[errors.slug]} />}
            </Field>

            <div className="grid grid-cols-1 gap-5 @md/field-group:grid-cols-2">
              <Field data-invalid={!!errors.tipe_konten}>
                <FieldLabel htmlFor="tipe_konten" className={labelClass}>
                  Jenis Konten <span aria-hidden className="text-destructive">*</span>
                </FieldLabel>
                <Select
                  defaultValue={defaultValues?.tipe_konten}
                  onValueChange={(v) => {
                    setValue("tipe_konten", v as "artikel_gizi" | "resep_mpasi", { shouldValidate: true });
                    if (tipeKontenRef.current) tipeKontenRef.current.value = v;
                  }}
                >
                  <SelectTrigger
                    id="tipe_konten"
                    aria-invalid={!!errors.tipe_konten}
                    className="w-full"
                  >
                    <SelectValue placeholder="Pilih jenis konten" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      <SelectItem value="artikel_gizi">Artikel Gizi</SelectItem>
                      <SelectItem value="resep_mpasi">Resep MPASI</SelectItem>
                    </SelectGroup>
                  </SelectContent>
                </Select>
                <input
                  type="hidden"
                  name="tipe_konten"
                  ref={tipeKontenRef}
                  defaultValue={defaultValues?.tipe_konten ?? ""}
                />
                {errors.tipe_konten && <FieldError errors={[errors.tipe_konten]} />}
              </Field>

              <Field data-invalid={!!errors.kategori_umur}>
                <FieldLabel htmlFor="kategori_umur" className={labelClass}>
                  Kategori Usia <span aria-hidden className="text-destructive">*</span>
                </FieldLabel>
                <Select
                  defaultValue={defaultValues?.kategori_umur}
                  onValueChange={(v) => {
                    setValue("kategori_umur", v as "0-6" | "6-8" | "9-11" | "12-24" | "24-60", { shouldValidate: true });
                    if (kategoriUmurRef.current) kategoriUmurRef.current.value = v;
                  }}
                >
                  <SelectTrigger
                    id="kategori_umur"
                    aria-invalid={!!errors.kategori_umur}
                    className="w-full"
                  >
                    <SelectValue placeholder="Pilih usia" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      {Object.entries(AGE_BUCKET_LABEL).map(([k, label]) => (
                        <SelectItem key={k} value={k}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
                <input
                  type="hidden"
                  name="kategori_umur"
                  ref={kategoriUmurRef}
                  defaultValue={defaultValues?.kategori_umur ?? ""}
                />
                {errors.kategori_umur && <FieldError errors={[errors.kategori_umur]} />}
              </Field>
            </div>

            <Field>
              <FieldLabel className={labelClass}>Thumbnail</FieldLabel>
              <FieldDescription className="text-[13px] leading-relaxed text-muted-foreground">
                Gambar akan dikompresi otomatis hingga maks. 2MB sebelum diunggah.
              </FieldDescription>
              <div className="mt-2">
                <ThumbnailUpload
                  value={thumbnailUrl}
                  onChange={setThumbnailUrl}
                />
              </div>
            </Field>
          </FieldGroup>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Isi Konten</CardTitle>
        </CardHeader>
        <CardContent>
          <TipTapEditor
            content={kontenHtml}
            onChange={setKontenHtml}
          />
        </CardContent>
      </Card>

      {mode === "edit" && (
        <Card>
          <CardContent className="pt-6">
            <label className="flex items-center gap-3">
              <Checkbox
                checked={published}
                onCheckedChange={(v) => setPublished(v === true)}
              />
              <span className="text-[15px] font-medium">Terbitkan</span>
            </label>
          </CardContent>
        </Card>
      )}

      <CardFooter className="flex flex-wrap items-center justify-between gap-3">
        {actionError && (
          <p className="text-[13px] text-destructive">{actionError}</p>
        )}
        <div className="flex items-center gap-2">
          <Button
            type="submit"
            variant="default"
            className="gap-2"
            disabled={isPending}
          >
            {isPending ? (
              <Loader2 className="animate-spin" aria-hidden />
            ) : (
              <Save className="size-4" strokeWidth={1.5} aria-hidden />
            )}
            {mode === "create" ? "Simpan sebagai Draft" : "Simpan Perubahan"}
          </Button>
        </div>
      </CardFooter>
    </form>
  );
}
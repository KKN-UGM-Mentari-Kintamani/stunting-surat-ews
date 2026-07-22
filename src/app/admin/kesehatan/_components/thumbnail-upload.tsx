"use client";

/* src/app/admin/kesehatan/_components/thumbnail-upload.tsx
 * Compresses the selected image client-side (browser-image-compression, max 2MB
 * per PRD §4.2D) before uploading to Supabase Storage via the cadre server
 * action. Shows a preview after success and a progress state during compression.
 */
import { useState, useTransition, useRef } from "react";
import imageCompression from "browser-image-compression";
import { ImagePlus, Loader2, X } from "lucide-react";

import { uploadThumbnailAction } from "@/app/admin/kesehatan/_actions";
import { Button } from "@/components/ui/button";

interface Props {
  value?: string;
  onChange: (url: string) => void;
}

export function ThumbnailUpload({ value, onChange }: Props) {
  const [preview, setPreview] = useState<string | null>(value ?? null);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    setProgress("Mengompresi…");

    try {
      const compressed = await imageCompression(file, {
        maxSizeMB: 2,
        maxWidthOrHeight: 1200,
        useWebWorker: true,
        onProgress: (p: number) => setProgress(`Mengompresi ${p}%`),
      });
      setProgress("Mengunggah…");

      const formData = new FormData();
      formData.append("file", compressed, compressed.name);

      start(async () => {
        const res = await uploadThumbnailAction(formData);
        if (!res.ok) {
          setError(res.error);
          setProgress(null);
          return;
        }
        setPreview(res.url);
        onChange(res.url);
        setProgress(null);
      });
    } catch (err) {
      console.error("[thumbnail-upload] compression failed:", err);
      setError("Gagal mengompresi gambar.");
      setProgress(null);
    }

    // Reset input so the same file can be re-selected.
    e.target.value = "";
  }

  return (
    <div className="flex flex-col gap-3">
      {preview ? (
        <div className="relative inline-flex overflow-hidden rounded-md border border-border">
          <img
            src={preview}
            alt="Pratinjau thumbnail"
            className="h-36 w-48 object-cover"
          />
          <Button
            variant="ghost"
            size="icon-xs"
            className="absolute right-1 top-1 size-6 bg-background/80 hover:bg-background"
            onClick={() => {
              setPreview(null);
              onChange("");
            }}
          >
            <X className="size-3.5" aria-hidden />
            <span className="sr-only">Hapus gambar</span>
          </Button>
        </div>
      ) : (
        <>
          <Button
            variant="outline"
            className="h-36 w-48 flex-col gap-2 border-dashed text-muted-foreground"
            onClick={() => inputRef.current?.click()}
            type="button"
            disabled={!!progress}
          >
            {progress ? (
              <>
                <Loader2 className="size-5 animate-spin" aria-hidden />
                <span className="text-[13px]">{progress}</span>
              </>
            ) : (
              <>
                <ImagePlus className="size-6 opacity-40" strokeWidth={1.5} aria-hidden />
                <span className="text-[13px] leading-tight text-center">
                  Unggah thumbnail
                  <br />
                  <span className="text-muted-foreground">(maks. 2 MB, dikompresi otomatis)</span>
                </span>
              </>
            )}
          </Button>
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFile}
          />
        </>
      )}
      {error && (
        <p className="text-[13px] text-destructive">{error}</p>
      )}
    </div>
  );
}
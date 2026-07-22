"use client";

/* Publish/Unpublish toggle button — revalidates both the CMS and the public
 * directory after toggling. Thin wrapper: no state needed, just form action. */
import { useTransition } from "react";
import { Eye, EyeOff } from "lucide-react";

import { publishArticleAction } from "@/app/admin/kesehatan/_actions";
import { Button } from "@/components/ui/button";

export function PublishButton({
  id,
  published,
}: {
  id: string;
  published: boolean;
}) {
  const [pending, start] = useTransition();

  return (
    <Button
      variant="ghost"
      size="xs"
      disabled={pending}
      onClick={() => start(async () => { await publishArticleAction(id, !published); })}
    >
      {published ? (
        <EyeOff className="size-3.5" strokeWidth={1.5} aria-hidden />
      ) : (
        <Eye className="size-3.5" strokeWidth={1.5} aria-hidden />
      )}
      {pending ? "…" : null}
      <span className="sr-only">{published ? "Sembunyikan" : "Terbitkan"}</span>
    </Button>
  );
}
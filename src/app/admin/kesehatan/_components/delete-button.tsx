"use client";

/* Delete button with confirmation dialog. Wraps the server action in a useTransition
 * so the row stays visible until revalidation finishes. */
import { useState, useTransition } from "react";
import { Loader2, Trash2 } from "lucide-react";

import { deleteArticleAction } from "@/app/admin/kesehatan/_actions";
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

export function DeleteButton({ id, title }: { id: string; title: string }) {
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="xs">
          <Trash2 className="size-3.5" strokeWidth={1.5} aria-hidden />
          <span className="sr-only">Hapus</span>
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Hapus konten?</DialogTitle>
          <DialogDescription>
            &quot;{title}&quot; akan dihapus permanen. Tindakan ini tidak dapat
            dibatalkan.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button
            variant="ghost"
            onClick={() => setOpen(false)}
            disabled={pending}
          >
            Batal
          </Button>
          <Button
            variant="destructive"
            disabled={pending}
            onClick={() =>
              start(async () => {
                await deleteArticleAction(id);
                setOpen(false);
              })
            }
          >
            {pending && <Loader2 className="animate-spin" aria-hidden />}
            Hapus
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
"use client";

/* src/app/profil/_components/auto-open-add-child.tsx
 * Used by the Home save-flow's "Tambah Anak Baru" deeplink (`/profil?new=1`).
 * The `?new=1` flag is read server-side (no flash of "the dialog opens late")
 * and passed as `autoOpen`. The URL is cleaned client-side on mount so a
 * refresh doesn't reopen. Keeps the deeplink behaviour in one tiny client
 * component so the page itself stays a server component.
 */
import { useEffect, useState } from "react";

import { AddChildDialog } from "@/app/profil/_components/add-child-dialog";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

export function AutoOpenAddChild({ autoOpen }: { autoOpen: boolean }) {
  const [open, setOpen] = useState(autoOpen);

  useEffect(() => {
    if (!autoOpen || typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    params.delete("new");
    const next = params.toString()
      ? `${window.location.pathname}?${params.toString()}`
      : window.location.pathname;
    window.history.replaceState(null, "", next);
    // Run once per mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <AddChildDialog open={open} onOpenChange={setOpen} noTrigger>
      <Button variant="default" className="gap-2">
        <Plus className="size-4" strokeWidth={1.5} aria-hidden />
        Tambah Anak
      </Button>
    </AddChildDialog>
  );
}
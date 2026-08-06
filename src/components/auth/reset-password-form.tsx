"use client";

/* src/components/auth/reset-password-form.tsx
 * Collects a new password + confirmation and completes the Supabase reset flow
 * (exchange one-time code → set new password → role-based landing).
 */
import { useState, useTransition } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { updatePasswordFromResetAction } from "@/lib/auth/actions";
import { Button } from "@/components/ui/button";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";

export function ResetPasswordForm({ code }: { code: string }) {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, start] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (password.length < 8) {
      setError("Kata sandi minimal 8 karakter.");
      return;
    }
    if (password !== confirm) {
      setError("Konfirmasi kata sandi tidak cocok.");
      return;
    }
    start(async () => {
      const res = await updatePasswordFromResetAction(code, password);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      toast.success("Kata sandi berhasil diubah.", {
        description: "Silakan masuk dengan kata sandi baru.",
      });
    });
  }

  const valid = password.length >= 8 && password === confirm;

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <Field>
        <FieldLabel htmlFor="rp-pass" className="text-[15px] font-medium">
          Kata Sandi Baru
        </FieldLabel>
        <Input
          id="rp-pass"
          type="password"
          autoComplete="new-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Minimal 8 karakter"
        />
      </Field>
      <Field>
        <FieldLabel htmlFor="rp-confirm" className="text-[15px] font-medium">
          Konfirmasi Kata Sandi
        </FieldLabel>
        <Input
          id="rp-confirm"
          type="password"
          autoComplete="new-password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          placeholder="Ulangi kata sandi"
        />
      </Field>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Button type="submit" disabled={!valid || isPending} className="gap-2">
        {isPending && <Loader2 className="animate-spin" aria-hidden />}
        Simpan Kata Sandi
      </Button>
    </form>
  );
}

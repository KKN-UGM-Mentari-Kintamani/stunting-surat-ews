"use client";

/* src/components/auth/account-security.tsx
 * "Keamanan Akun" card: lets any signed-in user set or change their password
 * so they can sign in with email + password (Google remains an option).
 * Reused across all roles: warga profile, kader dashboard, admin dashboard.
 */
import { useState, useTransition } from "react";
import { KeyRound, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { resetPasswordAction, setPasswordAction } from "@/lib/auth/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";

export function AccountSecurity({ email }: { email?: string | null }) {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, start] = useTransition();
  const [resetSent, setResetSent] = useState(false);
  const [resetPending, setResetPending] = useState(false);

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
      const res = await setPasswordAction(password);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      toast.success("Kata sandi berhasil disimpan.", {
        description: "Kini Anda juga bisa masuk dengan email & kata sandi.",
      });
      setPassword("");
      setConfirm("");
    });
  }

  async function handleReset() {
    if (!email) return;
    setResetPending(true);
    setResetSent(false);
    const res = await resetPasswordAction(email);
    setResetPending(false);
    if (!res.ok) {
      toast.error("Gagal mengirim tautan reset.", { description: res.error });
      return;
    }
    setResetSent(true);
    toast.success("Tautan reset terkirim.", {
      description: "Periksa email Anda.",
    });
  }

  const valid = password.length >= 8 && password === confirm;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
          <KeyRound className="size-6 text-primary" strokeWidth={1.5} aria-hidden />
          <CardTitle>Keamanan Akun</CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        <p className="mb-4 text-[14px] leading-relaxed text-muted-foreground">
          Buat atau ubah kata sandi agar Anda dapat masuk dengan email &amp; kata
          sandi. Masuk dengan Google tetap bisa dipakai.
        </p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field>
              <FieldLabel htmlFor="sec-pass" className="text-[15px] font-medium">
                Kata Sandi Baru
              </FieldLabel>
              <Input
                id="sec-pass"
                type="password"
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Minimal 8 karakter"
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="sec-confirm" className="text-[15px] font-medium">
                Konfirmasi Kata Sandi
              </FieldLabel>
              <Input
                id="sec-confirm"
                type="password"
                autoComplete="new-password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                placeholder="Ulangi kata sandi"
              />
            </Field>
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="flex flex-wrap items-center gap-3">
            <Button type="submit" disabled={!valid || isPending} className="gap-2">
              {isPending && <Loader2 className="animate-spin" aria-hidden />}
              Simpan Kata Sandi
            </Button>
            {email && (
              <Button type="button" variant="outline" disabled={resetPending} onClick={handleReset}>
                {resetPending ? <Loader2 className="animate-spin" aria-hidden /> : null}
                {resetSent ? "Tautan terkirim" : "Lupa Kata Sandi?"}
              </Button>
            )}
          </div>
          {resetSent && (
            <FieldDescription className="text-[13px] text-muted-foreground">
              Tautan reset telah dikirim ke {email}. Periksa kotak masuk Anda.
            </FieldDescription>
          )}
        </form>
      </CardContent>
    </Card>
  );
}

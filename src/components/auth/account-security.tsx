"use client";

/* src/components/auth/account-security.tsx
 * "Keamanan Akun" card: one button "Buat / Ubah Kata Sandi" that always sends
 * a password-reset email (works for creating a first password AND replacing an
 * existing one — Supabase treats both the same). No direct set-password form,
 * keeping the flow safe (email-verified) and consistent with /login.
 */
import { useState } from "react";
import { KeyRound, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { resetPasswordAction } from "@/lib/auth/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function AccountSecurity({ email }: { email?: string | null }) {
  const [pending, setPending] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleReset() {
    if (!email || pending) return;
    setPending(true);
    setSent(false);
    const res = await resetPasswordAction(email);
    setPending(false);
    if (!res.ok) {
      toast.error("Gagal mengirim tautan.", { description: res.error });
      return;
    }
    setSent(true);
    toast.success("Tautan terkirim.", {
      description: "Periksa email Anda untuk membuat/mengubah kata sandi.",
    });
  }

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
          sandi. Masuk dengan Google tetap bisa dipakai. Kami akan mengirimkan
          tautan ke email Anda untuk mengatur kata sandi.
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <Button type="button" onClick={handleReset} disabled={pending || !email} className="gap-2">
            {pending && <Loader2 className="animate-spin" aria-hidden />}
            {sent ? "Tautan Terkirim" : "Buat / Ubah Kata Sandi"}
          </Button>
        </div>
        {sent && email && (
          <p className="mt-3 text-[13px] text-muted-foreground">
            Tautan telah dikirim ke {email}. Periksa kotak masuk Anda.
          </p>
        )}
      </CardContent>
    </Card>
  );
}

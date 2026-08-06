"use client";

/* src/components/auth/login-form.tsx
 * Client side of /login: two sign-in modes — Google OAuth (gated behind explicit
 * PDP consent, PRD §4.4) and Email + Password (for users who set a password on
 * their account). Consent only applies to the Google (sign-up) flow.
 */
import { useState, useTransition } from "react";
import Link from "next/link";
import { KeyRound, Mail, Sprout } from "lucide-react";
import { toast } from "sonner";

import {
  resetPasswordAction,
  signInWithGoogleAction,
  signInWithPasswordAction,
} from "@/lib/auth/actions";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

function GoogleMark() {
  return (
    <svg viewBox="0 0 24 24" className="size-5" aria-hidden data-icon="inline-start">
      <path
        fill="#4285F4"
        d="M23.5 12.3c0-.9-.1-1.5-.3-2.2H12v4.3h6.5c-.1 1.1-.8 2.7-2.4 3.8l-.02.15 3.5 2.7.24.03c2.2-2.1 3.5-5.1 3.5-8.8z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.2 0 5.9-1.1 7.9-2.9l-3.8-2.9c-1 .7-2.4 1.2-4.1 1.2-3.1 0-5.8-2.1-6.7-5l-.14.01-3.1 2.4-.04.11C4 21.1 7.7 24 12 24z"
      />
      <path
        fill="#FBBC05"
        d="M5.3 14.4c-.24-.7-.38-1.5-.38-2.4s.14-1.7.36-2.4l-.01-.16-3.15-2.44-.1.05C1.4 8.6 1 10.2 1 12s.4 3.4 1.02 4.9l3.28-2.5z"
      />
      <path
        fill="#EA4335"
        d="M12 4.6c2.2 0 3.7 1 4.6 1.8l3.3-3.3C17.9 1.2 15.2 0 12 0 7.7 0 4 2.9 2.02 7.1l3.26 2.5c.9-2.9 3.6-5 6.72-5z"
      />
    </svg>
  );
}

type Mode = "google" | "password";

const labelClass = "text-[15px] font-medium leading-snug";

export function LoginForm({
  next,
  hasError,
}: {
  next?: string;
  hasError: boolean;
}) {
  const [mode, setMode] = useState<Mode>("password");
  const [consent, setConsent] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [forgotOpen, setForgotOpen] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotPending, setForgotPending] = useState(false);

  function handleSignIn() {
    setError(null);
    startTransition(async () => {
      await signInWithGoogleAction(next);
    });
  }

  function handlePasswordSignIn(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!email.trim() || !password) {
      setError("Isi email dan kata sandi.");
      return;
    }
    startTransition(async () => {
      const res = await signInWithPasswordAction(email, password, next);
      if (!res.ok) setError(res.error);
    });
  }

  async function handleForgot(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!forgotEmail.trim()) {
      toast.error("Masukkan email Anda terlebih dahulu.");
      return;
    }
    setForgotPending(true);
    const res = await resetPasswordAction(forgotEmail);
    setForgotPending(false);
    if (!res.ok) {
      toast.error("Gagal mengirim tautan reset.", { description: res.error });
      return;
    }
    toast.success("Tautan reset terkirim.", {
      description: "Periksa email Anda untuk mengatur ulang kata sandi.",
    });
    setForgotOpen(false);
  }

  const canSubmitPassword =
    email.trim().length > 0 && password.length > 0 && !isPending;

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="items-center text-center">
        <span className="mb-2 flex size-12 items-center justify-center rounded-md bg-primary text-primary-foreground">
          <Sprout className="size-6" strokeWidth={1.5} aria-hidden />
        </span>
        <CardTitle className="font-display text-[22px] leading-[1.25]">
          Selamat datang di Portal Desa
        </CardTitle>
        <CardDescription className="text-[15px]">
          Masuk untuk menyimpan riwayat tumbuh kembang anak dan mengakses
          layanan desa lainnya.
        </CardDescription>
      </CardHeader>

      <CardContent className="flex flex-col gap-4">
        {hasError && (
          <Alert variant="destructive">
            <AlertDescription>
              Gagal masuk. Silakan coba lagi, atau hubungi perangkat desa bila
              kendala berlanjut.
            </AlertDescription>
          </Alert>
        )}

        {/* Mode toggle */}
        <div className="grid grid-cols-2 gap-1 rounded-md bg-muted p-1 text-[14px] font-medium">
          <button
            type="button"
            onClick={() => { setMode("google"); setError(null); }}
            className={`rounded-sm px-3 py-1.5 transition-colors ${
              mode === "google"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Akun Google
          </button>
          <button
            type="button"
            onClick={() => { setMode("password"); setError(null); }}
            className={`rounded-sm px-3 py-1.5 transition-colors ${
              mode === "password"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Email &amp; Kata Sandi
          </button>
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {mode === "google" ? (
          <>
            {/* PDP Law consent (PRD §4.4) — explicit opt-in, never pre-checked. */}
            <Field orientation="horizontal" className="items-start">
              <Checkbox
                id="consent"
                checked={consent}
                onCheckedChange={(v) => setConsent(v === true)}
                aria-describedby="consent-desc"
                className="mt-1"
              />
              <div className="flex flex-col gap-1">
                <label htmlFor="consent" className="text-[15px] font-medium leading-snug">
                  Saya menyetujui pengumpulan &amp; penggunaan data
                </label>
                <FieldDescription id="consent-desc" className="text-[13px] leading-relaxed">
                  Data yang dikumpulkan: data anak (nama, tanggal lahir, hasil
                  pengukuran) dan — pada layanan surat — NIK/KK. Data dipakai untuk
                  pemantauan tumbuh kembang dan administrasi desa, tidak dibagikan
                  ke pihak lain. Anda dapat meminta penghapusan data melalui
                  perangkat desa.
                </FieldDescription>
              </div>
            </Field>

            <Button
              type="button"
              size="lg"
              className="w-full gap-2"
              disabled={!consent || isPending}
              onClick={handleSignIn}
            >
              <GoogleMark />
              {isPending ? "Mengalihkan ke Google…" : "Masuk dengan Google"}
            </Button>
          </>
        ) : (
          <form onSubmit={handlePasswordSignIn} className="flex flex-col gap-4">
            <Field>
              <FieldLabel htmlFor="login-email" className={labelClass}>
                Email
              </FieldLabel>
              <Input
                id="login-email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="nama@contoh.com"
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="login-password" className={labelClass}>
                Kata Sandi
              </FieldLabel>
              <Input
                id="login-password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Masukkan kata sandi"
              />
            </Field>
            <div className="text-right">
              <button
                type="button"
                onClick={() => setForgotOpen(true)}
                className="text-[13px] font-medium text-secondary underline-offset-4 hover:underline"
              >
                Lupa kata sandi?
              </button>
            </div>
            <Button type="submit" size="lg" className="w-full gap-2" disabled={!canSubmitPassword}>
              <KeyRound className="size-4" strokeWidth={1.5} aria-hidden />
              {isPending ? "Memeriksa…" : "Masuk"}
            </Button>
          </form>
        )}

        <p className="text-center text-[13px] text-muted-foreground">
          Tanpa akun?{" "}
          <Link href="/" className="font-medium text-secondary underline-offset-4 hover:underline">
            Kembali ke kalkulator
          </Link>{" "}
          — kalkulator stunting dapat dipakai tanpa masuk.
        </p>
      </CardContent>

      {/* Forgot password dialog */}
      <Dialog open={forgotOpen} onOpenChange={setForgotOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Mail className="size-5" strokeWidth={1.5} aria-hidden />
              Lupa Kata Sandi
            </DialogTitle>
            <DialogDescription>
              Masukkan email akun Anda. Kami akan mengirimkan tautan untuk
              mengatur ulang kata sandi.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleForgot} className="flex flex-col gap-4">
            <Field>
              <FieldLabel htmlFor="forgot-email" className={labelClass}>Email</FieldLabel>
              <Input
                id="forgot-email"
                type="email"
                autoComplete="email"
                value={forgotEmail}
                onChange={(e) => setForgotEmail(e.target.value)}
                placeholder="nama@contoh.com"
              />
            </Field>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setForgotOpen(false)}>
                Batal
              </Button>
              <Button type="submit" disabled={forgotPending || !forgotEmail.trim()}>
                {forgotPending ? "Mengirim…" : "Kirim Tautan Reset"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

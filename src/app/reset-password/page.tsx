/* src/app/reset-password/page.tsx
 * Landing page for the password-reset email link. The one-time `code` arrives
 * as a query param; a client form collects the new password and completes the
 * reset via updatePasswordFromResetAction.
 */
import { Suspense } from "react";

import { ResetPasswordForm } from "@/components/auth/reset-password-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Sprout } from "lucide-react";

export const metadata = { title: "Atur Ulang Kata Sandi" };

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ code?: string }>;
}) {
  const { code } = await searchParams;

  return (
    <div className="flex flex-1 items-center justify-center px-5 py-12">
      <Card className="w-full max-w-md">
        <CardHeader className="items-center text-center">
          <span className="mb-2 flex size-12 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <Sprout className="size-6" strokeWidth={1.5} aria-hidden />
          </span>
          <CardTitle className="font-display text-[22px] leading-[1.25]">
            Atur Ulang Kata Sandi
          </CardTitle>
        </CardHeader>
        <CardContent>
          {code ? (
            <Suspense>
              <ResetPasswordForm code={code} />
            </Suspense>
          ) : (
            <p className="text-center text-[15px] text-muted-foreground">
              Tautan tidak valid. Gunakan tautan yang dikirim ke email Anda.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

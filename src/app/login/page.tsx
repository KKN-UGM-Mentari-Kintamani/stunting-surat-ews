/* src/app/login/page.tsx
 * Google SSO entry (Supabase Auth — see src/lib/auth/actions.ts for why not
 * NextAuth). PDP Law §4.4: explicit, unchecked consent is required before
 * the sign-in button becomes active.
 */
import { redirect } from "next/navigation";

import { LoginForm } from "@/components/auth/login-form";
import { createClient } from "@/lib/supabase/server";

export const metadata = {
  title: "Masuk",
  description: "Masuk ke Portal Desa dengan akun Google Anda.",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  const { next, error } = await searchParams;

  // Already signed in → skip straight to the destination.
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) redirect(next && next.startsWith("/") ? next : "/");

  return (
    <div className="flex flex-1 items-center justify-center px-5 py-12">
      <LoginForm next={next} hasError={error === "oauth"} />
    </div>
  );
}

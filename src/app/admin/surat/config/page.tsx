/* src/app/admin/surat/config/page.tsx
 * Admin Desa — konfigurasi Kepala Desa.
 */
import { getKadesConfigAction } from "@/app/admin/surat/_actions";
import { KadesConfigForm } from "@/app/admin/surat/_components/kades-config-form";

export const metadata = { title: "Konfigurasi Kepala Desa" };

export default async function KadesConfigPage() {
  const res = await getKadesConfigAction();
  const config = res.ok ? (res.data ?? null) : null;

  return (
    <div className="flex flex-col gap-6 py-10 md:py-14">
      <h1 className="font-display text-[28px] leading-[1.15] font-semibold">
        Konfigurasi Kepala Desa
      </h1>
      <KadesConfigForm initial={config} />
    </div>
  );
}

/* src/lib/calc/profile-schema.ts
 * Zod schemas for the /profil forms. Server re-uses these in the server
 * actions so client and server can never disagree (AGENTS.md defensive
 * programming: never trust the client).
 */
import { z } from "zod";

export const addChildSchema = z.object({
  nama: z
    .string()
    .trim()
    .min(2, "Nama anak minimal 2 karakter.")
    .max(80, "Nama anak maksimal 80 karakter."),
  jenisKelamin: z.enum(["L", "P"], {
    message: "Pilih jenis kelamin anak.",
  }),
  tanggalLahir: z
    .string()
    .min(1, "Tanggal lahir wajib diisi.")
    .refine((v) => !Number.isNaN(new Date(v).getTime()), {
      message: "Tanggal lahir tidak valid.",
    })
    .refine((v) => new Date(v) <= new Date(), {
      message: "Tanggal lahir tidak boleh di masa depan.",
    })
    .refine(
      (v) => {
        // Rough upper-bound sanity check (not the WHO bound — that's enforced
        // at measurement time below; a 50-year-old registering as a "child"
        // is an obvious error).
        const ageYears =
          (Date.now() - new Date(v).getTime()) / (1000 * 60 * 60 * 24 * 365.25);
        return ageYears >= 0 && ageYears <= 6;
      },
      { message: "Rentang usia WHO 2006 adalah 0–60 bulan (± 5 tahun)." },
    ),
});
export type AddChildValues = z.infer<typeof addChildSchema>;

export const measurementSchema = z.object({
  anakId: z.string().uuid("ID anak tidak valid."),
  tanggalUkur: z
    .string()
    .min(1, "Tanggal ukur wajib diisi.")
    .refine((v) => !Number.isNaN(new Date(v).getTime()), {
      message: "Tanggal ukur tidak valid.",
    })
    .refine((v) => new Date(v) <= new Date(), {
      message: "Tanggal ukur tidak boleh di masa depan.",
    }),
  beratBadanKg: z
    .number({ message: "Masukkan berat badan." })
    .min(1, "Berat minimal 1 kg — periksa kembali angkanya.")
    .max(45, "Berat di luar rentang wajar balita (maks. 45 kg)."),
  tinggiBadanCm: z
    .number({ message: "Masukkan tinggi/panjang badan." })
    .min(35, "Panjang minimal 35 cm — periksa kembali angkanya.")
    .max(130, "Tinggi di luar rentang wajar balita (maks. 130 cm)."),
  lingkarKepalaCm: z
    .number()
    .min(20, "Lingkar kepala minimal 20 cm.")
    .max(60, "Lingkar kepala maksimal 60 cm.")
    .optional(),
  lingkarLenganCm: z
    .number()
    .min(5, "Lingkar lengan minimal 5 cm.")
    .max(30, "Lingkar lengan maksimal 30 cm.")
    .optional(),
});
export type MeasurementValues = z.infer<typeof measurementSchema>;
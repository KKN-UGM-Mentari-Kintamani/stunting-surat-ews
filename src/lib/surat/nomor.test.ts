/* src/lib/surat/nomor.test.ts
 * Unit tests for letter-number validation (manual entry by village staff)
 * and verification-code generation.
 */
import { describe, expect, it } from "vitest";

import { generateKodeVerifikasi, validateNomorSurat } from "@/lib/surat/nomor";

describe("validateNomorSurat (manual entry)", () => {
  it("accepts a full manual letter number", () => {
    expect(validateNomorSurat("470/012/VII/2026")).toBeNull();
  });

  it("trims surrounding whitespace", () => {
    expect(validateNomorSurat("  470/012/VII/2026  ")).toBeNull();
  });

  it("rejects empty / blank input", () => {
    expect(validateNomorSurat("")).toMatch(/wajib diisi/);
    expect(validateNomorSurat("   ")).toMatch(/wajib diisi/);
  });

  it("rejects oversized input (max 60 chars)", () => {
    const tooLong = "470/".padEnd(70, "1");
    expect(validateNomorSurat(tooLong)).toMatch(/terlalu panjang/);
  });

  it("rejects forbidden characters", () => {
    expect(validateNomorSurat("470/012/VII;2026")).toMatch(/hanya boleh/);
    expect(validateNomorSurat("470/012 <script>")).toMatch(/hanya boleh/);
  });
});

describe("generateKodeVerifikasi", () => {
  it("returns 8 chars by default from the safe alphabet (no I/O/0/1)", () => {
    const kode = generateKodeVerifikasi();
    expect(kode).toHaveLength(8);
    expect(kode).toMatch(/^[A-HJ-NP-Z2-9]+$/);
  });

  it("honors a custom length", () => {
    expect(generateKodeVerifikasi(12)).toHaveLength(12);
  });

  it("is unique across successive calls", () => {
    expect(generateKodeVerifikasi()).not.toBe(generateKodeVerifikasi());
  });
});

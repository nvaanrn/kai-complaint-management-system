import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST } from "@/app/api/upload/route";
import { Role } from "@/types/database";
import * as authModule from "@/lib/auth";
import { NextRequest } from "next/server";

vi.mock("@/lib/auth", () => ({
  getCurrentUser: vi.fn(),
}));

describe("API Route: /api/upload (Proof Image Upload Hardening)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("harus menolak request tanpa autentikasi (401)", async () => {
    vi.spyOn(authModule, "getCurrentUser").mockResolvedValue(null);

    const req = new NextRequest("http://localhost:3000/api/upload", {
      method: "POST",
    });

    const res = await POST(req);
    expect(res.status).toBe(401);
    const data = await res.json();
    expect(data.error).toBe("Unauthorized.");
  });

  it("harus menolak request dari role VERIFIKATOR (403)", async () => {
    vi.spyOn(authModule, "getCurrentUser").mockResolvedValue({
      id: "u-verif",
      name: "Verifikator",
      email: "verifikator@kai.id",
      role: Role.VERIFIKATOR,
    });

    const req = new NextRequest("http://localhost:3000/api/upload", {
      method: "POST",
    });

    const res = await POST(req);
    expect(res.status).toBe(403);
    const data = await res.json();
    expect(data.error).toBe("Anda tidak memiliki akses untuk mengunggah file.");
  });

  it("harus menolak request jika tidak ada file yang disertakan (400)", async () => {
    vi.spyOn(authModule, "getCurrentUser").mockResolvedValue({
      id: "u-pic",
      name: "PIC Lapangan",
      email: "pic@kai.id",
      role: Role.PIC,
    });

    const formData = new FormData();
    const req = new NextRequest("http://localhost:3000/api/upload", {
      method: "POST",
      body: formData,
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBe("Tidak ada file yang diunggah.");
  });

  it("harus menolak file dengan tipe MIME yang dilarang (misal .pdf / .exe) (400)", async () => {
    vi.spyOn(authModule, "getCurrentUser").mockResolvedValue({
      id: "u-pic",
      name: "PIC Lapangan",
      email: "pic@kai.id",
      role: Role.PIC,
    });

    const file = new File(["dummy pdf content"], "document.pdf", { type: "application/pdf" });
    const formData = new FormData();
    formData.append("file", file);

    const req = new NextRequest("http://localhost:3000/api/upload", {
      method: "POST",
      body: formData,
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBe("Format file tidak didukung. Gunakan PNG, JPG, atau WebP.");
  });

  it("harus menolak file jika magic bytes header tidak sesuai dengan gambar valid (400)", async () => {
    vi.spyOn(authModule, "getCurrentUser").mockResolvedValue({
      id: "u-pic",
      name: "PIC Lapangan",
      email: "pic@kai.id",
      role: Role.PIC,
    });

    // File dipalsukan sebagai image/png tetapi isinya teks biasa bukan magic bytes PNG
    const file = new File(["FAKE-IMAGE-HEADER"], "fake.png", { type: "image/png" });
    const formData = new FormData();
    formData.append("file", file);

    const req = new NextRequest("http://localhost:3000/api/upload", {
      method: "POST",
      body: formData,
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBe("Isi file tidak sesuai dengan format gambar yang didukung.");
  });

  it("harus meloloskan dan menyimpan foto PNG valid secara aman (200)", async () => {
    vi.spyOn(authModule, "getCurrentUser").mockResolvedValue({
      id: "u-pic",
      name: "PIC Lapangan",
      email: "pic@kai.id",
      role: Role.PIC,
    });

    // 1x1 valid PNG binary buffer: 89 50 4E 47 0D 0A 1A 0A ...
    const pngBytes = new Uint8Array([
      0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d, 0x49, 0x48,
      0x44, 0x52, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01, 0x08, 0x06, 0x00, 0x00,
      0x00, 0x1f, 0x15, 0xc4, 0x89, 0x00, 0x00, 0x00, 0x0a, 0x49, 0x44, 0x41, 0x54, 0x78,
      0x9c, 0x63, 0x00, 0x01, 0x00, 0x00, 0x05, 0x00, 0x01, 0x0d, 0x0a, 0x2d, 0xb4, 0x00,
      0x00, 0x00, 0x00, 0x49, 0x45, 0x4e, 0x44, 0xae, 0x42, 0x60, 0x82,
    ]);

    const file = new File([pngBytes], "valid_proof.png", { type: "image/png" });
    const formData = new FormData();
    formData.append("file", file);

    const req = new NextRequest("http://localhost:3000/api/upload", {
      method: "POST",
      body: formData,
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.url).toBeDefined();
    expect(typeof data.url).toBe("string");
    // URL harus berupa URL Cloudinary atau path lokal /uploads/
    expect(data.url.startsWith("http") || data.url.startsWith("/uploads/")).toBe(true);
  });
});

import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { cloudinary } from "@/lib/cloudinary";
import { Role } from "@/types/database";

// Magic bytes untuk validasi konten file (jangan hanya percaya MIME dari client)
const MAGIC_BYTES: Record<string, number[][]> = {
  "image/png": [[0x89, 0x50, 0x4e, 0x47]],
  "image/jpeg": [[0xff, 0xd8, 0xff]],
  "image/webp": [[0x52, 0x49, 0x46, 0x46]], // RIFF header
};

const ALLOWED_TYPES = Object.keys(MAGIC_BYTES);
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

/**
 * Validasi isi file berdasarkan magic bytes header.
 * Mengembalikan true jika header file sesuai dengan salah satu format yang diizinkan.
 */
function validateFileMagicBytes(buffer: Buffer): boolean {
  for (const signatures of Object.values(MAGIC_BYTES)) {
    for (const sig of signatures) {
      if (buffer.length >= sig.length && sig.every((b, i) => buffer[i] === b)) {
        return true;
      }
    }
  }
  return false;
}

/**
 * Route Handler: Upload foto bukti lapangan ke Cloudinary.
 * Hanya dapat diakses oleh PIC (yang mengerjakan keluhan) atau Admin.
 * Returns: { url: string } — URL publik Cloudinary yang tersimpan di field proofImageUrl
 */
export async function POST(req: NextRequest) {
  // 1. Validasi autentikasi
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  // 2. Validasi role: hanya PIC dan Admin yang boleh upload bukti
  if (user.role !== Role.PIC && user.role !== Role.ADMIN) {
    return NextResponse.json(
      { error: "Anda tidak memiliki akses untuk mengunggah file." },
      { status: 403 }
    );
  }

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "Tidak ada file yang diunggah." }, { status: 400 });
    }

    // 3. Validasi tipe MIME dari client (layer pertama)
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: "Format file tidak didukung. Gunakan PNG, JPG, atau WebP." },
        { status: 400 }
      );
    }

    // 4. Validasi ukuran file
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: "Ukuran file terlalu besar. Maksimal 5MB." },
        { status: 400 }
      );
    }

    // 5. Baca buffer dan validasi magic bytes (layer kedua - jangan percaya MIME saja)
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    if (!validateFileMagicBytes(buffer)) {
      return NextResponse.json(
        { error: "Isi file tidak sesuai dengan format gambar yang didukung." },
        { status: 400 }
      );
    }

    // 6. Upload ke Cloudinary via buffer (base64 data URI)
    // Nama file menggunakan timestamp + random suffix (bukan nama pengguna/asli)
    const uniqueId = `proof-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
    const base64 = buffer.toString("base64");
    const dataUri = `data:${file.type};base64,${base64}`;

    const result = await cloudinary.uploader.upload(dataUri, {
      folder: "spkp-kai/proof-images",
      resource_type: "image",
      public_id: uniqueId,
      overwrite: false, // Cegah penimpaan file yang sudah ada
      transformation: [
        { quality: "auto:good" },
        { fetch_format: "auto" },
        { width: 2048, height: 2048, crop: "limit" },
      ],
    });

    return NextResponse.json({ url: result.secure_url });
  } catch (error: any) {
    console.error("Error uploading file ke Cloudinary:", error);
    // Jangan bocorkan detail error internal ke client
    return NextResponse.json(
      { error: "Gagal mengunggah foto bukti. Coba lagi." },
      { status: 500 }
    );
  }
}

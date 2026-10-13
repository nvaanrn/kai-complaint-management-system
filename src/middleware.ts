export { default } from "next-auth/middleware";

export const config = {
  matcher: [
    /*
     * Berlaku untuk semua rute kecuali:
     * - _next/static (build static assets)
     * - _next/image (image optimization)
     * - favicon.ico
     * - Gambar statis (.svg, .png, .jpg, dll)
     * - /login (halaman login itu sendiri)
     * - /api/auth (NextAuth route handler)
     */
    "/((?!_next/static|_next/image|favicon.ico|login|api/auth|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};

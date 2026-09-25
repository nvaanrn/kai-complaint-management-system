import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token;
    const isAuth = !!token;
    const { pathname } = req.nextUrl;

    // Jika sudah login dan mengakses halaman login, alihkan ke dashboard
    if (pathname.startsWith("/login") && isAuth) {
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        const { pathname } = req.nextUrl;

        // Berikan izin akses ke halaman login
        if (pathname.startsWith("/login")) {
          return true;
        }

        // Halaman lain wajib terautentikasi (memiliki token)
        return !!token;
      },
    },
    pages: {
      signIn: "/login",
    },
  }
);

export const config = {
  matcher: [
    /*
     * Berlaku untuk semua rute kecuali:
     * - api/auth (handler internal NextAuth)
     * - _next/static (aset statis build)
     * - _next/image (optimasi gambar)
     * - favicon.ico
     */
    "/((?!api/auth|_next/static|_next/image|favicon.ico).*)",
  ],
};

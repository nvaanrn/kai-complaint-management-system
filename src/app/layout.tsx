import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'SPKP - Sistem Penanganan Keluhan Pelanggan',
  description: 'Sistem Informasi Penanganan & Verifikasi Keluhan Pelanggan',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id">
      <body className="min-h-screen bg-slate-50 text-slate-900 antialiased">
        {children}
      </body>
    </html>
  );
}

"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Image from "next/image";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMsg("");

    try {
      const res = await signIn("credentials", {
        redirect: false,
        email: email.trim(),
        password: password.trim(),
      });

      if (res?.error) {
        setErrorMsg("Email atau kata sandi tidak sesuai. Silakan periksa kembali.");
      } else {
        router.push("/dashboard");
        router.refresh();
      }
    } catch (err) {
      setErrorMsg("Terjadi gangguan koneksi saat masuk ke sistem.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickFill = (roleEmail: string) => {
    setEmail(roleEmail);
    setPassword("password123");
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50/80 p-4 sm:p-6 text-slate-800 font-sans">
      <div className="max-w-md w-full bg-white rounded-3xl shadow-sm border border-slate-200/80 p-8 sm:p-10 space-y-6">
        {/* Brand Logo & Header */}
        <div className="text-center space-y-3">
          <div className="flex justify-center">
            <Image
              src="/kai-logo.png"
              alt="PT Kereta Api Indonesia (Persero)"
              width={140}
              height={44}
              className="h-11 w-auto object-contain"
              priority
              unoptimized
            />
          </div>
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-900 border border-blue-200 uppercase tracking-widest">
              FR.SM/TI/033.001
            </div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight mt-2">
              Sistem Penanganan Keluhan (SPKP)
            </h1>
            <p className="text-xs text-slate-400 mt-0.5">
              Portal Internal Pengendalian Mutu Layanan Pelanggan KAI
            </p>
          </div>
        </div>

        {/* Error Alert */}
        {errorMsg && (
          <div className="bg-rose-50 border border-rose-200 text-rose-800 text-xs p-3.5 rounded-2xl text-center font-medium animate-in fade-in duration-150">
            {errorMsg}
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Email Staf KAI
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="nama@spkp.kai.id"
              className="w-full px-4 py-2.5 text-sm bg-slate-50/70 border border-slate-200 rounded-xl text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-900 focus:bg-white transition"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                Kata Sandi
              </label>
            </div>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="••••••••"
              className="w-full px-4 py-2.5 text-sm bg-slate-50/70 border border-slate-200 rounded-xl text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-900 focus:bg-white transition"
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-blue-900 hover:bg-blue-800 active:scale-98 text-white font-semibold py-3 rounded-xl transition duration-150 text-sm shadow-sm disabled:opacity-50 cursor-pointer mt-2"
          >
            {isLoading ? "Memverifikasi Kredensial..." : "Masuk ke Sistem SPKP"}
          </button>
        </form>

        {/* Quick Role Fill Hint */}
        <div className="pt-4 border-t border-slate-100 space-y-2">
          <p className="text-[11px] text-slate-400 text-center font-medium">
            Pilih akun uji coba cepat (Password: <span className="font-mono text-slate-600">password123</span>):
          </p>
          <div className="grid grid-cols-3 gap-1.5 text-center">
            <button
              type="button"
              onClick={() => handleQuickFill("admin@spkp.kai.id")}
              className="px-2 py-1.5 rounded-lg text-[10px] font-bold bg-rose-50 text-rose-800 border border-rose-200 hover:bg-rose-100 transition cursor-pointer"
            >
              Admin
            </button>
            <button
              type="button"
              onClick={() => handleQuickFill("pic@spkp.kai.id")}
              className="px-2 py-1.5 rounded-lg text-[10px] font-bold bg-blue-50 text-blue-900 border border-blue-200 hover:bg-blue-100 transition cursor-pointer"
            >
              PIC Teknis
            </button>
            <button
              type="button"
              onClick={() => handleQuickFill("verifikator@spkp.kai.id")}
              className="px-2 py-1.5 rounded-lg text-[10px] font-bold bg-purple-50 text-purple-900 border border-purple-200 hover:bg-purple-100 transition cursor-pointer"
            >
              Verifikator
            </button>
          </div>
        </div>

        {/* Footer Note */}
        <div className="pt-2 text-[10px] text-slate-400 text-center">
          Standar Pengendalian Mutu Internal &bull; PT Kereta Api Indonesia (Persero)
        </div>
      </div>
    </div>
  );
}
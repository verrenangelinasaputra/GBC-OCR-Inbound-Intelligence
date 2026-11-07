"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";

const inputClass =
  "mt-1 w-full rounded-lg border border-slate-600 bg-slate-900 px-3 py-2 text-sm text-white";

export function SupplierForgotPasswordForm() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [step, setStep] = useState<"username" | "reset">("username");
  const [info, setInfo] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function sendCode(e?: React.FormEvent) {
    e?.preventDefault();
    setLoading(true);
    setError("");
    const res = await fetch("/api/supplier/auth/forgot/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(data.error ?? "Gagal mengirim kode");
      return;
    }
    setInfo(data.devHint ? `${data.message} ${data.devHint}` : data.message);
    setStep("reset");
  }

  async function reset(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const res = await fetch("/api/supplier/auth/forgot/reset", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, code, password, confirmPassword }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(data.error ?? "Reset gagal");
      return;
    }
    router.push("/supplier/login");
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-900 px-4">
      <div className="w-full max-w-md rounded-xl border border-slate-700 bg-slate-800 p-8 text-slate-100">
        <h1 className="text-xl font-semibold">Lupa password</h1>
        <p className="mt-1 text-sm text-slate-400">Kode dikirim ke email akun Anda dari nomarcengkareng@gmail.com.</p>
        {step === "username" ? (
          <form onSubmit={sendCode} className="mt-6 space-y-4">
            <div>
              <label className="text-sm text-slate-300">Username</label>
              <input className={inputClass} value={username} onChange={(e) => setUsername(e.target.value)} required />
            </div>
            {error && <p className="text-sm text-red-400">{error}</p>}
            <button type="submit" disabled={loading} className="w-full rounded-lg bg-blue-500 py-2.5 text-sm font-medium text-white hover:bg-blue-600 disabled:opacity-50">
              {loading ? "Mengirim..." : "Kirim kode"}
            </button>
          </form>
        ) : (
          <form onSubmit={reset} className="mt-6 space-y-4">
            {info && <p className="text-sm text-slate-300">{info}</p>}
            <div>
              <label className="text-sm text-slate-300">Kode verifikasi</label>
              <input className={inputClass} inputMode="numeric" maxLength={6} value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))} required />
            </div>
            <div>
              <label className="text-sm text-slate-300">Password baru</label>
              <input type="password" className={inputClass} value={password} onChange={(e) => setPassword(e.target.value)} required />
            </div>
            <div>
              <label className="text-sm text-slate-300">Konfirmasi password</label>
              <input type="password" className={inputClass} value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required />
            </div>
            {error && <p className="text-sm text-red-400">{error}</p>}
            <button type="submit" disabled={loading || code.length !== 6} className="w-full rounded-lg bg-blue-500 py-2.5 text-sm font-medium text-white hover:bg-blue-600 disabled:opacity-50">
              {loading ? "Menyimpan..." : "Simpan password"}
            </button>
            <button type="button" disabled={loading} onClick={() => sendCode()} className="w-full text-sm text-slate-400 hover:text-white">
              Kirim ulang kode
            </button>
          </form>
        )}
        <p className="mt-6 text-center text-sm">
          <Link href="/supplier/login" className="text-blue-300 hover:underline">Kembali ke login</Link>
        </p>
      </div>
    </div>
  );
}

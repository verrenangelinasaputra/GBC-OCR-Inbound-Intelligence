"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";

const inputClass =
  "mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20";

export function SupplierSheetLogin() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const res = await fetch("/api/supplier/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(data.error ?? "Login gagal");
      return;
    }
    router.push(data.redirect ?? "/supplier");
    router.refresh();
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-8 shadow-sm">
        <h1 className="text-xl font-semibold">Login Supplier</h1>
        <p className="mt-1 text-sm text-slate-500">Masuk dengan username dan password. Kode verifikasi dikirim dari nomarcengkareng@gmail.com saat daftar atau reset password.</p>
        <form onSubmit={onSubmit} className="mt-6 space-y-4">
          <div>
            <label className="text-sm font-medium text-slate-700">Username</label>
            <input className={inputClass} autoComplete="username" value={username} onChange={(e) => setUsername(e.target.value)} required />
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700">Password</label>
            <input type="password" className={inputClass} autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button type="submit" disabled={loading} className="w-full rounded-lg bg-blue-600 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50">
            {loading ? "Memproses..." : "Login Supplier"}
          </button>
        </form>
        <div className="mt-4 grid grid-cols-2 gap-3">
          <Link href="/supplier/register" className="rounded-lg border border-slate-300 py-2.5 text-center text-sm font-medium text-slate-700 hover:bg-slate-50">
            Register
          </Link>
          <Link href="/supplier/forgot-password" className="rounded-lg border border-slate-300 py-2.5 text-center text-sm font-medium text-slate-700 hover:bg-slate-50">
            Forgot password
          </Link>
        </div>
        <p className="mt-4 text-center text-xs text-slate-500">
          Tim GBC (admin / DBM)?{" "}
          <Link href="/login" className="text-blue-600 hover:underline">
            Login internal
          </Link>
        </p>
      </div>
    </div>
  );
}

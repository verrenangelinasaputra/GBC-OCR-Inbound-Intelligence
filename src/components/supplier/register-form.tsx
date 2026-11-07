"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";

const inputClass =
  "mt-1 w-full rounded-lg border border-slate-600 bg-slate-900 px-3 py-2 text-sm text-white";

export function SupplierRegisterForm() {
  const router = useRouter();
  const [supplierName, setSupplierName] = useState("");
  const [contactName, setContactName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [code, setCode] = useState("");
  const [step, setStep] = useState<"form" | "code">("form");
  const [info, setInfo] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function sendCode(e?: React.FormEvent) {
    e?.preventDefault();
    setLoading(true);
    setError("");
    const res = await fetch("/api/supplier/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ supplierName, contactName, username, email, phone, password, confirmPassword }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(data.error ?? "Gagal mengirim kode");
      return;
    }
    setInfo(data.devHint ? `${data.message} ${data.devHint}` : `${data.message} (${data.maskedEmail ?? email})`);
    setStep("code");
  }

  async function verify(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const res = await fetch("/api/supplier/auth/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, code }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(data.error ?? "Verifikasi gagal");
      return;
    }
    router.push("/supplier/login");
    router.refresh();
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-900 px-4 py-10">
      <div className="w-full max-w-md rounded-xl border border-slate-700 bg-slate-800 p-8 text-slate-100">
        <h1 className="text-xl font-semibold">Daftar Supplier</h1>
        <p className="mt-1 text-sm text-slate-400">
          Kode verifikasi dikirim ke email Anda dari nomarcengkareng@gmail.com. Setelah itu login memakai username dan password.
        </p>
        {step === "form" ? (
          <form onSubmit={sendCode} className="mt-6 space-y-4">
            <Field label="Nama perusahaan" value={supplierName} onChange={setSupplierName} />
            <Field label="Nama kontak" value={contactName} onChange={setContactName} />
            <Field label="Username (untuk login)" value={username} onChange={setUsername} autoComplete="username" />
            <Field label="Email" value={email} onChange={setEmail} type="email" autoComplete="email" />
            <Field label="Nomor telepon" value={phone} onChange={setPhone} type="tel" autoComplete="tel" />
            <Field label="Password" value={password} onChange={setPassword} type="password" autoComplete="new-password" />
            <Field label="Konfirmasi password" value={confirmPassword} onChange={setConfirmPassword} type="password" autoComplete="new-password" />
            {error && <p className="text-sm text-red-400">{error}</p>}
            <button type="submit" disabled={loading} className="w-full rounded-lg bg-blue-500 py-2.5 text-sm font-medium text-white hover:bg-blue-600 disabled:opacity-50">
              {loading ? "Mengirim..." : "Kirim kode verifikasi"}
            </button>
          </form>
        ) : (
          <form onSubmit={verify} className="mt-6 space-y-4">
            {info && <p className="text-sm text-slate-300">{info}</p>}
            <Field label="Kode verifikasi (6 digit)" value={code} onChange={(value) => setCode(value.replace(/\D/g, "").slice(0, 6))} inputMode="numeric" />
            {error && <p className="text-sm text-red-400">{error}</p>}
            <button type="submit" disabled={loading || code.length !== 6} className="w-full rounded-lg bg-blue-500 py-2.5 text-sm font-medium text-white hover:bg-blue-600 disabled:opacity-50">
              {loading ? "Memeriksa..." : "Verifikasi dan daftar"}
            </button>
            <button type="button" disabled={loading} onClick={() => sendCode()} className="w-full text-sm text-slate-400 hover:text-white">
              Kirim ulang kode
            </button>
          </form>
        )}
        <p className="mt-6 text-center text-sm">
          <Link href="/supplier/login" className="text-blue-300 hover:underline">Sudah punya akun? Masuk</Link>
        </p>
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  autoComplete,
  inputMode,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  autoComplete?: string;
  inputMode?: "numeric" | "text" | "tel" | "email";
}) {
  return (
    <div>
      <label className="text-sm text-slate-300">{label}</label>
      <input
        className={inputClass}
        type={type}
        autoComplete={autoComplete}
        inputMode={inputMode}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required
      />
    </div>
  );
}

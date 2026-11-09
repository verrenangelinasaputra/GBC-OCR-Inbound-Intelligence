"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { SUPPLIER_GUDANG_OPTIONS } from "@/lib/config/supplier-gudang";

export function InternalRegisterForm() {
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [gudang, setGudang] = useState<string>(SUPPLIER_GUDANG_OPTIONS[0]);
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
    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fullName,
        username,
        email,
        phone,
        gudang,
        password,
        confirmPassword,
      }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(data.error ?? "Gagal mengirim kode");
      return;
    }
    setInfo(
      data.devHint
        ? `${data.message} ${data.devHint}`
        : `${data.message} (${data.maskedEmail ?? email})`
    );
    setStep("code");
  }

  async function verify(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const res = await fetch("/api/auth/register/verify", {
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
    router.push("/login?registered=1");
    router.refresh();
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100 px-4 py-10">
      <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-8 shadow-sm">
        <h1 className="text-xl font-semibold text-slate-900">Daftar Warehouse Intelligence</h1>
        <p className="mt-1 text-sm text-slate-500">
          Untuk operator gudang GBC. Kode verifikasi dikirim dari nomarcengkareng@gmail.com ke email
          Anda.
        </p>

        {step === "form" ? (
          <form onSubmit={sendCode} className="mt-6 space-y-4">
            <Field label="Nama lengkap" value={fullName} onChange={setFullName} />
            <Field
              label="Username (untuk login)"
              value={username}
              onChange={setUsername}
              autoComplete="username"
            />
            <Field label="Email" value={email} onChange={setEmail} type="email" autoComplete="email" />
            <Field label="No. telepon" value={phone} onChange={setPhone} type="tel" autoComplete="tel" />
            <SelectField label="Gudang tujuan" value={gudang} onChange={setGudang} options={SUPPLIER_GUDANG_OPTIONS} />
            <Field
              label="Password"
              value={password}
              onChange={setPassword}
              type="password"
              autoComplete="new-password"
            />
            <Field
              label="Konfirmasi password"
              value={confirmPassword}
              onChange={setConfirmPassword}
              type="password"
              autoComplete="new-password"
            />
            {error && <p className="text-sm text-red-600">{error}</p>}
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-blue-600 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60"
            >
              {loading ? "Mengirim..." : "Kirim kode verifikasi"}
            </button>
          </form>
        ) : (
          <form onSubmit={verify} className="mt-6 space-y-4">
            {info && <p className="text-sm text-slate-600">{info}</p>}
            <Field
              label="Kode verifikasi (6 digit)"
              value={code}
              onChange={(v) => setCode(v.replace(/\D/g, "").slice(0, 6))}
              inputMode="numeric"
            />
            {error && <p className="text-sm text-red-600">{error}</p>}
            <button
              type="submit"
              disabled={loading || code.length !== 6}
              className="w-full rounded-lg bg-blue-600 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60"
            >
              {loading ? "Memeriksa..." : "Verifikasi dan daftar"}
            </button>
            <button
              type="button"
              disabled={loading}
              onClick={() => sendCode()}
              className="w-full text-sm text-slate-500 hover:text-slate-800"
            >
              Kirim ulang kode
            </button>
          </form>
        )}

        <p className="mt-6 text-center text-xs text-slate-500">
          Supplier?{" "}
          <Link href="/supplier/register" className="text-blue-600 hover:underline">
            Daftar portal supplier
          </Link>
        </p>
        <p className="mt-2 text-center text-sm">
          <Link href="/login" className="text-blue-600 hover:underline">
            Sudah punya akun? Login
          </Link>
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
  const inputClass =
    "mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900";
  return (
    <div>
      <label className="text-sm font-medium text-slate-700">{label}</label>
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

function SelectField({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: readonly string[];
}) {
  return (
    <div>
      <label className="text-sm font-medium text-slate-700">{label}</label>
      <select
        className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required
      >
        {options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    </div>
  );
}

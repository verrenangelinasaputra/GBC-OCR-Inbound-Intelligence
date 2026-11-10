"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { SUPPLIER_GUDANG_OPTIONS } from "@/lib/config/supplier-gudang";

export function InternalRegisterForm() {
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [gudang, setGudang] = useState<string[]>([]);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [code, setCode] = useState("");
  const [step, setStep] = useState<"form" | "code">("form");
  const [info, setInfo] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function sendCode(e?: React.FormEvent) {
    e?.preventDefault();
    if (!gudang.length) {
      setError("Pilih minimal satu gudang tujuan.");
      return;
    }
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
    const base = data.devHint
      ? `${data.message} ${data.devHint}`
      : `${data.message} (${data.maskedEmail ?? email})`;
    setInfo(
      `${base} Baris akun masuk spreadsheet setelah Anda memasukkan kode verifikasi (langkah berikutnya).`
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
    const tab = data.savedTo?.tab ?? "Users";
    setInfo(
      `${data.message ?? "Berhasil."} Baris akun ada di tab "${tab}" spreadsheet credentials GBC.`
    );
    await new Promise((r) => setTimeout(r, 2500));
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
            <GudangCheckboxDropdown selected={gudang} onChange={setGudang} options={SUPPLIER_GUDANG_OPTIONS} />
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
            <p className="text-xs text-slate-500">
              Setelah kode dikirim, cek email lalu verifikasi — baru setelah itu data masuk tab{" "}
              <strong>Users</strong> di spreadsheet warehouse credentials.
            </p>
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

function GudangCheckboxDropdown({
  selected,
  onChange,
  options,
}: {
  selected: string[];
  onChange: (next: string[]) => void;
  options: readonly string[];
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [open]);

  function toggle(option: string) {
    onChange(
      selected.includes(option) ? selected.filter((g) => g !== option) : [...selected, option]
    );
  }

  const summary =
    selected.length === 0
      ? "Pilih gudang…"
      : selected.length === 1
        ? selected[0]
        : `${selected.length} gudang dipilih`;

  return (
    <div ref={rootRef} className="relative">
      <span className="text-sm font-medium text-slate-700">Gudang tujuan</span>
      <p className="mt-0.5 text-xs text-slate-500">Boleh lebih dari satu — centang di daftar</p>
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="mt-1 flex w-full items-center justify-between rounded-lg border border-slate-300 bg-white px-3 py-2 text-left text-sm text-slate-900"
      >
        <span className={selected.length ? "text-slate-900" : "text-slate-400"}>{summary}</span>
        <span className="text-slate-400" aria-hidden>
          {open ? "▴" : "▾"}
        </span>
      </button>
      {open && (
        <div className="absolute z-20 mt-1 max-h-52 w-full overflow-y-auto rounded-lg border border-slate-200 bg-white py-1 shadow-md">
          {options.map((o) => (
            <label
              key={o}
              className="flex cursor-pointer items-center gap-2 px-3 py-2 text-sm hover:bg-slate-50"
            >
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-slate-300 text-blue-600"
                checked={selected.includes(o)}
                onChange={() => toggle(o)}
              />
              <span>{o}</span>
            </label>
          ))}
        </div>
      )}
      {selected.length > 1 && (
        <p className="mt-1 text-xs text-slate-500">{selected.join("; ")}</p>
      )}
    </div>
  );
}

"use client";

import { useState } from "react";

export function CreateUserForm({
  roles,
  suppliers,
}: {
  roles: { id: string; code: string; name: string }[];
  suppliers: { id: string; code: string; name: string }[];
}) {
  const [msg, setMsg] = useState("");

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const res = await fetch("/api/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username: fd.get("username"),
        password: fd.get("password"),
        fullName: fd.get("fullName"),
        roleCode: fd.get("roleCode"),
        supplierId: fd.get("supplierId") || undefined,
      }),
    });
    const data = await res.json();
    setMsg(res.ok ? "User dibuat" : data.error ?? "Gagal");
  }

  return (
    <form onSubmit={onSubmit} className="grid max-w-xl gap-3 rounded-xl border bg-white p-4 text-sm">
      <p className="font-medium">Create user (admin)</p>
      <input name="username" placeholder="Username" required className="rounded border px-2 py-1" />
      <input name="fullName" placeholder="Full name" required className="rounded border px-2 py-1" />
      <input name="password" type="password" placeholder="Password" required className="rounded border px-2 py-1" />
      <select name="roleCode" required className="rounded border px-2 py-1">
        {roles.map((r) => (
          <option key={r.id} value={r.code}>
            {r.name}
          </option>
        ))}
      </select>
      <select name="supplierId" className="rounded border px-2 py-1">
        <option value="">— Supplier (jika supplier user) —</option>
        {suppliers.map((s) => (
          <option key={s.id} value={s.id}>
            {s.code}
          </option>
        ))}
      </select>
      <button type="submit" className="rounded bg-blue-600 py-2 text-white">
        Simpan user
      </button>
      {msg && <p>{msg}</p>}
    </form>
  );
}

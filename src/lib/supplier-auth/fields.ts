import { SupplierAuthError } from "./errors";

export function normalizeUsername(raw: string): string {
  return String(raw ?? "").trim().toLowerCase();
}

export function normalizeEmail(raw: string): string {
  return String(raw ?? "").trim().toLowerCase();
}

export function validateUsername(raw: string): string {
  const username = normalizeUsername(raw);
  if (!username || username.length < 3 || username.length > 32) {
    throw new SupplierAuthError("Username wajib 3–32 karakter.");
  }
  if (!/^[a-z0-9._-]+$/.test(username)) {
    throw new SupplierAuthError("Username hanya huruf, angka, titik, strip, dan underscore.");
  }
  return username;
}

export function validateEmail(raw: string): string {
  const email = normalizeEmail(raw);
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new SupplierAuthError("Email tidak valid.");
  }
  return email;
}

export function validatePasswordPair(password: string, confirm: string): void {
  if (password.length < 8) throw new SupplierAuthError("Password minimal 8 karakter.");
  if (password !== confirm) throw new SupplierAuthError("Konfirmasi password tidak sama.");
}

export function maskEmail(email: string): string {
  const [name, domain] = email.split("@");
  if (!name || !domain) return email;
  return `${name.slice(0, 1)}***@${domain}`;
}

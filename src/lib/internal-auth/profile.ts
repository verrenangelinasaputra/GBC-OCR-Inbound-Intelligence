import { findInternalUserByUsername } from "./directory";

export type InternalUserProfile = {
  username: string;
  fullName: string;
  email: string;
  gudangList: string[];
};

export function parseGudangList(raw: string | null | undefined): string[] {
  return String(raw ?? "")
    .split(/[;|]/)
    .map((g) => g.trim())
    .filter(Boolean);
}

export async function getInternalUserProfile(username: string): Promise<InternalUserProfile | null> {
  const account = await findInternalUserByUsername(username);
  if (!account) return null;
  return {
    username: account.username,
    fullName: account.fullName || account.username,
    email: account.email,
    gudangList: parseGudangList(account.gudang),
  };
}

export function userCanAccessGudang(gudangList: string[], gudang: string | null | undefined): boolean {
  const g = String(gudang ?? "").trim();
  if (!g) return true;
  if (!gudangList.length) return true;
  return gudangList.some((x) => x === g);
}

import { findSupplierByUsername } from "./directory";

export async function resolveSupplierCompanyName(username: string | undefined): Promise<string> {
  const key = username?.trim();
  if (!key) return "GBC Internal";
  const account = await findSupplierByUsername(key);
  const name = account?.supplierName?.trim();
  return name && name.length >= 2 ? name : key;
}

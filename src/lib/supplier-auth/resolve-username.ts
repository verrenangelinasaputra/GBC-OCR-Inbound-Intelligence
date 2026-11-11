import { findSupplierByUsername, listAllSupplierAccounts } from "./directory";

/** Nama di kolom sheet OCR (supplier_name atau username). */
export async function resolveSupplierUsername(sheetSupplier: string | undefined): Promise<string | null> {
  const label = sheetSupplier?.trim();
  if (!label || label === "Unverified") return null;

  const byUser = await findSupplierByUsername(label.toLowerCase());
  if (byUser?.username) return byUser.username;

  const accounts = await listAllSupplierAccounts();
  const low = label.toLowerCase();
  const hit = accounts.find(
    (a) =>
      a.supplierName.trim().toLowerCase() === low ||
      a.username.trim().toLowerCase() === low ||
      a.contactName.trim().toLowerCase() === low
  );
  return hit?.username ?? null;
}

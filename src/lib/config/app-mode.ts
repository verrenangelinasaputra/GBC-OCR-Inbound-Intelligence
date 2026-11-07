/** Tanpa PostgreSQL — data Surat Jalan hanya ke Google Sheet + Drive. */
export function isSheetOnlyMode(): boolean {
  return process.env.SHEET_ONLY_MODE === "true";
}

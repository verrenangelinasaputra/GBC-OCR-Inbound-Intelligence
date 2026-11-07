export class SupplierAuthError extends Error {
  readonly status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.name = "SupplierAuthError";
    this.status = status;
  }
}

export function supplierAuthStatus(error: unknown): number {
  if (error instanceof SupplierAuthError) return error.status;
  const message = error instanceof Error ? error.message : "";
  if (/SESSION_SECRET|spreadsheet|service account|Email belum|SMTP/i.test(message)) return 500;
  return 400;
}

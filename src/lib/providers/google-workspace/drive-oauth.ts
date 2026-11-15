import { google } from "googleapis";

export type DriveOAuthEnv = {
  clientId: string;
  clientSecret: string;
  refreshToken: string;
};

export function getDriveOAuthEnvOptional(): DriveOAuthEnv | null {
  const clientId = process.env.GOOGLE_DRIVE_OAUTH_CLIENT_ID?.trim();
  const clientSecret = process.env.GOOGLE_DRIVE_OAUTH_CLIENT_SECRET?.trim();
  const refreshToken = process.env.GOOGLE_DRIVE_OAUTH_REFRESH_TOKEN?.trim();
  if (!clientId || !clientSecret || !refreshToken) return null;
  return { clientId, clientSecret, refreshToken };
}

export function isDriveOAuthConfigured(): boolean {
  return getDriveOAuthEnvOptional() != null;
}

/** Upload pakai kuota My Drive pemilik refresh token (mis. nomarcengkareng@gmail.com). */
export function createDriveOAuthClient() {
  const env = getDriveOAuthEnvOptional();
  if (!env) return null;
  const oauth2 = new google.auth.OAuth2(env.clientId, env.clientSecret);
  oauth2.setCredentials({ refresh_token: env.refreshToken });
  return oauth2;
}

/** Pesan operasional saat Google menolak refresh token (upload Drive gagal, sheet tetap jalan). */
export function driveOAuthRefreshHint(rawMessage: string): string | null {
  const m = rawMessage.toLowerCase();
  if (!m.includes("invalid_grant")) return null;
  return (
    "OAuth Drive: refresh token tidak valid (invalid_grant). " +
    "Spreadsheet tetap terisi; foto tidak masuk Drive. Perbaikan: (1) Pastikan CLIENT_ID/SECRET di Vercel sama dengan saat token dibuat. " +
    "(2) Akun Google → Keamanan → akses pihak ketiga → hapus app OAuth project ini. " +
    "(3) Di mesin lokal jalankan `npm run drive:oauth-setup` (login akun pemilik folder Drive), salin refresh token baru ke Vercel `GOOGLE_DRIVE_OAUTH_REFRESH_TOKEN` tanpa spasi/kutip rusak. " +
    "(4) Redeploy. Jika OAuth consent masih Testing, token bisa kedaluwarsa ~7 hari — tambahkan test user atau publish app."
  );
}

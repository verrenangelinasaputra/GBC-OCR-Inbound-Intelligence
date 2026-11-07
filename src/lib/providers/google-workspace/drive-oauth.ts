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

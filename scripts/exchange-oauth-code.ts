import { loadEnvFile } from "./load-env";
import { google } from "googleapis";

loadEnvFile();

const code = process.argv[2]?.trim();
if (!code) {
  console.error("Usage: npx tsx scripts/exchange-oauth-code.ts <kode-dari-google>");
  process.exit(1);
}

async function main() {
  const oauth2 = new google.auth.OAuth2(
    process.env.GOOGLE_DRIVE_OAUTH_CLIENT_ID,
    process.env.GOOGLE_DRIVE_OAUTH_CLIENT_SECRET,
    "urn:ietf:wg:oauth:2.0:oob"
  );
  const { tokens } = await oauth2.getToken(code);
  if (!tokens.refresh_token) {
    console.error("Tidak ada refresh_token. Hapus akses app di akun Google → ulangi OAuth.");
    process.exit(1);
  }
  console.log(`GOOGLE_DRIVE_OAUTH_REFRESH_TOKEN=${tokens.refresh_token}`);
  console.log("GOOGLE_DRIVE_UPLOAD_AUTH=oauth");
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});

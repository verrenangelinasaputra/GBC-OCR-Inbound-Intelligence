/**
 * Satu kali: dapatkan refresh token untuk upload Drive sebagai akun Gmail (bukan service account).
 *
 * Prasyarat di Google Cloud (project yang sama dengan service account):
 * 1. OAuth consent screen → External → tambahkan test user (email pemilik Drive)
 * 2. Credentials → Create OAuth client ID → Desktop app
 * 3. Set di .env: GOOGLE_DRIVE_OAUTH_CLIENT_ID, GOOGLE_DRIVE_OAUTH_CLIENT_SECRET
 */
import * as readline from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import { google } from "googleapis";
import { loadEnvFile } from "./load-env";

loadEnvFile();

const SCOPES = ["https://www.googleapis.com/auth/drive"];

async function main() {
  const clientId = process.env.GOOGLE_DRIVE_OAUTH_CLIENT_ID?.trim();
  const clientSecret = process.env.GOOGLE_DRIVE_OAUTH_CLIENT_SECRET?.trim();
  if (!clientId || !clientSecret) {
    console.error(
      "Isi GOOGLE_DRIVE_OAUTH_CLIENT_ID dan GOOGLE_DRIVE_OAUTH_CLIENT_SECRET di .env (OAuth Desktop client)."
    );
    process.exit(1);
  }

  const oauth2 = new google.auth.OAuth2(clientId, clientSecret, "urn:ietf:wg:oauth:2.0:oob");
  const url = oauth2.generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    scope: SCOPES,
  });

  console.log("\n=== LANGKAH 1 (browser) — jangan tempel ini ke terminal ===\n");
  console.log("Copy baris URL di bawah, buka di Chrome, login Gmail pemilik folder Drive:\n");
  console.log(url);
  console.log(
    "\n=== LANGKAH 2 (browser) ===\n" +
      "Setelah 'Allow', Google menampilkan halaman dengan KODE PENDEK (bukan URL lagi).\n" +
      "Contoh kode: 4/0AeanS... atau 4/0Ad...  (beberapa puluh karakter, satu baris).\n" +
      "\n=== LANGKAH 3 (terminal) ===\n" +
      "Tempel HANYA kode pendek itu (bukan link https://accounts.google.com/...).\n"
  );

  const rl = readline.createInterface({ input, output });
  const code = (await rl.question("Tempel KODE dari Google (bukan URL): ")).trim();
  rl.close();

  if (/^https?:\/\//i.test(code) || code.includes("accounts.google.com")) {
    console.error(
      "\nItu URL, bukan kode. Ulangi: buka URL di browser → Allow → salin kode pendek di halaman Google.\n"
    );
    process.exit(1);
  }

  const { tokens } = await oauth2.getToken(code);
  if (!tokens.refresh_token) {
    console.error("Tidak ada refresh_token — ulangi dengan prompt=consent & hapus akses app di akun Google lalu coba lagi.");
    process.exit(1);
  }

  console.log("\n=== Tambahkan ke .env dan Vercel ===\n");
  console.log(`GOOGLE_DRIVE_OAUTH_REFRESH_TOKEN=${tokens.refresh_token}`);
  console.log("GOOGLE_DRIVE_UPLOAD_AUTH=oauth");
  console.log("\n(Tetap pakai GOOGLE_SERVICE_ACCOUNT_JSON untuk spreadsheet.)\n");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

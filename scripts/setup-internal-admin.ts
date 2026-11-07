import { randomUUID } from "node:crypto";
import { hashPassword } from "../src/lib/auth/password";
import { appendInternalUser, findInternalUserByUsername } from "../src/lib/internal-auth/directory";
import { loadEnvFile } from "./load-env";

loadEnvFile();

async function main() {
  const username = (process.env.SEED_ADMIN_USERNAME ?? "admin").trim().toLowerCase();
  const password = process.env.SEED_ADMIN_PASSWORD ?? "AdminGBC!2026";
  const existing = await findInternalUserByUsername(username);
  if (existing) {
    console.log(`User "${username}" sudah ada di spreadsheet internal (baris ${existing.rowNumber}).`);
    return;
  }
  const passwordHash = await hashPassword(password);
  await appendInternalUser({
    userId: randomUUID(),
    fullName: "Administrator GBC",
    username,
    email: "admin.demo@gbc.local",
    passwordHash,
    roles: ["SUPER_ADMIN", "DBM_OPERATOR", "WAREHOUSE_OPERATOR"],
  });
  console.log(`Admin "${username}" ditambahkan ke spreadsheet internal. Password: (dari SEED_ADMIN_PASSWORD / .env)`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

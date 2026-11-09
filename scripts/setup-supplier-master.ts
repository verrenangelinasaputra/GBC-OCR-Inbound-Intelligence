import { hashPassword } from "../src/lib/auth/password";
import { loadEnvFile } from "./load-env";

loadEnvFile();

async function main() {
  const username = (process.env.SUPPLIER_MASTER_USERNAME || "admin_supplier").trim();
  const password = process.env.SUPPLIER_MASTER_PASSWORD || "MasterSupplier!2026";
  const hash = await hashPassword(password);
  console.log("Tambahkan ke .env dan Vercel:\n");
  console.log(`SUPPLIER_MASTER_USERNAME="${username}"`);
  console.log(`SUPPLIER_MASTER_PASSWORD_HASH="${hash}"`);
  console.log(`\nLogin: /supplier/login — username ${username}, password (dari SUPPLIER_MASTER_PASSWORD saat generate).`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

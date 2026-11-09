import { loadEnvFile } from "./load-env";
import { supplierMasterPasswordExpected, supplierMasterUsername } from "../src/lib/supplier-auth/master-admin";

loadEnvFile();

function main() {
  const username = supplierMasterUsername();
  const password = supplierMasterPasswordExpected();
  console.log("Master supplier (tanpa hash bcrypt):\n");
  console.log(`  Username : ${username}`);
  console.log(`  Password : ${password}`);
  console.log("\nOpsional di Vercel — override:");
  console.log(`  SUPPLIER_MASTER_USERNAME="${username}"`);
  console.log(`  SUPPLIER_MASTER_PASSWORD="${password}"`);
  console.log("\nLogin: /supplier/login");
}

main();

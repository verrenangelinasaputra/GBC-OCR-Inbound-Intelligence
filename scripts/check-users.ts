import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const count = await prisma.user.count();
  const users = await prisma.user.findMany({
    select: { username: true, status: true },
    orderBy: { username: "asc" },
  });
  console.log("DATABASE_URL host:", process.env.DATABASE_URL?.replace(/:[^:@]+@/, ":****@"));
  console.log("User count:", count);
  console.log(users);
}

main()
  .catch((e) => {
    console.error("FAIL", e.message ?? e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

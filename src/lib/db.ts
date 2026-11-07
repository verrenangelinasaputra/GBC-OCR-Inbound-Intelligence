import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient | undefined };

export function hasDatabase(): boolean {
  return Boolean(process.env.DATABASE_URL?.trim());
}

function createDisabledPrisma(): PrismaClient {
  return new Proxy({} as PrismaClient, {
    get() {
      throw new Error(
        "Database tidak dikonfigurasi (DATABASE_URL kosong). Mode pilot: gunakan /supplier — login internal butuh Supabase."
      );
    },
  });
}

function createPrismaClient(): PrismaClient {
  if (!hasDatabase()) {
    return createDisabledPrisma();
  }
  return new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production" && hasDatabase()) {
  globalForPrisma.prisma = prisma;
}

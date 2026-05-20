// Import dynamically to avoid surface type mismatches on some build environments (Vercel)
// Use a runtime-resolved constructor so TypeScript doesn't fail when declaration shapes differ.
import * as PrismaPkg from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

// runtime constructor (any) — prefer named export, fallback to default or module itself
const PrismaClientCtor: any = (PrismaPkg as any).PrismaClient ?? (PrismaPkg as any).default ?? PrismaPkg;

function normalizeConnectionString(raw: string) {
  try {
    const url = new URL(raw);

    const sslMode = url.searchParams.get("sslmode");
    if (!sslMode || ["prefer", "require", "verify-ca"].includes(sslMode)) {
      url.searchParams.set("sslmode", "verify-full");
    }

    return url.toString();
  } catch {
    return raw;
  }
}

const prismaClientSingleton = () => {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error("DATABASE_URL is not defined");
  }

  const normalizedConnectionString = normalizeConnectionString(connectionString);

  const pool = new Pool({ connectionString: normalizedConnectionString });
  const adapter = new PrismaPg(pool);

  return new PrismaClientCtor({ adapter });
};

type PrismaClientSingleton = ReturnType<typeof prismaClientSingleton>;

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClientSingleton;
};

export const prisma =
  globalForPrisma.prisma ?? prismaClientSingleton();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

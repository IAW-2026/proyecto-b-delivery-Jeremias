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

let _prismaInstance: PrismaClientSingleton | undefined = globalForPrisma.prisma;

function createPrismaInstance(): PrismaClientSingleton {
  if (_prismaInstance) return _prismaInstance;
  _prismaInstance = prismaClientSingleton();
  if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = _prismaInstance;
  return _prismaInstance;
}

// Export a lazy proxy that constructs the real Prisma client on first access.
// This prevents throwing at module-import time when DATABASE_URL isn't set
// (e.g., during Vercel build). Accessing any property will trigger creation.
export const prisma = new Proxy(
  {},
  {
    get(_, prop) {
      try {
        // If DATABASE_URL is missing, let the caller handle the absent client by
        // receiving an error when attempting to use it. Construct when needed.
        return (createPrismaInstance() as any)[prop];
      } catch (err) {
        // Re-throw with clearer message to aid debugging during build/runtime.
        throw new Error(`Prisma client not available: ${String(err)}`);
      }
    },
    apply(_, thisArg, args) {
      return (createPrismaInstance() as any).apply(thisArg, args);
    },
  }
) as unknown as PrismaClientSingleton;

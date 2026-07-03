import "dotenv/config";
import { PrismaClient } from "@/generated/prisma/client";
import { PrismaLibSql } from "@prisma/adapter-libsql";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";

const PRISMA_CLIENT_VERSION = "family-is-active-v1";

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
  prismaVersion?: string;
};

function isTursoDatabase(url: string) {
  return url.startsWith("libsql://") || url.startsWith("https://");
}

function createTursoClient() {
  const url = process.env.DATABASE_URL!;
  const authToken = process.env.DATABASE_AUTH_TOKEN;
  const adapter = new PrismaLibSql({ url, authToken });
  return new PrismaClient({ adapter });
}

function createSqliteClient() {
  const url = process.env.DATABASE_URL ?? "file:./prisma/dev.db";
  const adapter = new PrismaBetterSqlite3({ url });
  return new PrismaClient({ adapter });
}

function createPrismaClient() {
  const url = process.env.DATABASE_URL ?? "file:./prisma/dev.db";
  if (isTursoDatabase(url)) {
    return createTursoClient();
  }
  return createSqliteClient();
}

export const prisma =
  globalForPrisma.prismaVersion === PRISMA_CLIENT_VERSION
    ? globalForPrisma.prisma!
    : (() => {
        const client = createPrismaClient();
        if (process.env.NODE_ENV !== "production") {
          globalForPrisma.prisma = client;
          globalForPrisma.prismaVersion = PRISMA_CLIENT_VERSION;
        }
        return client;
      })();

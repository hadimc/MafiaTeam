import path from "node:path";
import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
  prismaKey?: string;
};

const PRISMA_KEY = "scenario-attendees-v2";

function datasourceUrl() {
  const raw = process.env.DATABASE_URL ?? "file:./dev.db";
  if (!raw.startsWith("file:")) return raw;
  const file = raw.replace(/^file:/, "");
  if (path.isAbsolute(file)) return raw;
  return `file:${path.join(process.cwd(), "prisma", path.basename(file))}`;
}

function createClient() {
  return new PrismaClient({
    datasources: { db: { url: datasourceUrl() } },
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });
}

export const prisma =
  globalForPrisma.prisma && globalForPrisma.prismaKey === PRISMA_KEY
    ? globalForPrisma.prisma
    : createClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
  globalForPrisma.prismaKey = PRISMA_KEY;
}

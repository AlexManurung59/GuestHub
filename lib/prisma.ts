import { PrismaClient } from "../prisma/generated/client";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is not defined in the environment variables.");
}

const dbUrl = new URL(connectionString);

const adapter = new PrismaMariaDb({
  host: dbUrl.hostname,
  port: Number(dbUrl.port || 3306),
  user: dbUrl.username || "root",
  password: dbUrl.password || "",
  database: dbUrl.pathname.replace(/^\//, "") || undefined,
  connectionLimit: 5,
  minimumIdle: 1,
  idleTimeout: 30,
  connectTimeout: 5000,
});

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

const prisma =
  globalForPrisma.prisma ?? new PrismaClient({ adapter });

globalForPrisma.prisma = prisma;

export { prisma };
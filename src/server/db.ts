import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";
import { env } from "@/server/env";

const g = globalThis as unknown as { pmsPrisma?: PrismaClient; pmsPool?: Pool };

const pool =
  g.pmsPool ??
  new Pool({
    connectionString: env.databaseUrl,
    max: 10,
    idleTimeoutMillis: 60_000,
    connectionTimeoutMillis: 15_000,
    application_name: "pms",
  });

if (!g.pmsPool) pool.on("error", (err) => console.error("[db] idle client error:", err.message));

export const prisma: PrismaClient = g.pmsPrisma ?? new PrismaClient({ adapter: new PrismaPg(pool), log: env.isProduction ? ["error"] : ["error", "warn"] });

if (!env.isProduction) {
  g.pmsPrisma = prisma;
  g.pmsPool = pool;
}

export type { Prisma } from "@/generated/prisma/client";
export type Tx = Parameters<Parameters<PrismaClient["$transaction"]>[0]>[0];
export type Db = Tx | PrismaClient;

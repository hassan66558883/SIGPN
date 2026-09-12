import { prisma } from "@/server/db";

/** Liveness/readiness probe. Unauthenticated; exposes no data. */
export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return Response.json({ status: "ok", time: new Date().toISOString() });
  } catch {
    return Response.json({ status: "degraded", time: new Date().toISOString() }, { status: 503 });
  }
}

import { sql } from "drizzle-orm";
import { connection } from "next/server";
import { db } from "@/server/db/client";
import { logger } from "@/server/logger";

/** Liveness + database readiness for load balancers and uptime monitors. */
export async function GET() {
  await connection();
  try {
    await db().execute(sql`select 1`);
    return Response.json({ status: "ok" }, { headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    logger.error("health check failed", { err });
    return Response.json({ status: "error" }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}

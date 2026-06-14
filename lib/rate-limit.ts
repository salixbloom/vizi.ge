import { and, eq, gte, sql } from "drizzle-orm";
import { db } from "./db";
import { submissions } from "./schema";

export function maxPerDay(): number {
  const n = Number(process.env.MAX_SUBMISSIONS_PER_DAY);
  return Number.isFinite(n) && n > 0 ? n : 3;
}

/** Start of the current UTC day as a SQLite "YYYY-MM-DD HH:MM:SS" string. */
function startOfTodayUtc(): string {
  return `${new Date().toISOString().slice(0, 10)} 00:00:00`;
}

export type Quota = { limit: number; used: number; remaining: number };

export function getQuota(deviceId: string): Quota {
  const limit = maxPerDay();
  const row = db
    .select({ count: sql<number>`count(*)` })
    .from(submissions)
    .where(
      and(
        eq(submissions.deviceId, deviceId),
        gte(submissions.submittedAt, startOfTodayUtc()),
      ),
    )
    .get();
  const used = row?.count ?? 0;
  return { limit, used, remaining: Math.max(0, limit - used) };
}

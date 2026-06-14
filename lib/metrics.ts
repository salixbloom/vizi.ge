import { eq, sql } from "drizzle-orm";
import { db } from "./db";
import { devices, locations, submissions } from "./schema";

export type DashboardMetrics = {
  locations: { total: number; approved: number; archived: number };
  submissions: { pending: number; approved: number; rejected: number; total: number };
  devices: { total: number; blocked: number };
  perDay: { date: string; count: number }[];
  tileServer: { url: string; healthy: boolean; status?: number };
};

function countWhere(table: typeof submissions | typeof locations, column: any, value: string): number {
  const row = db
    .select({ c: sql<number>`count(*)` })
    .from(table as any)
    .where(eq(column, value))
    .get();
  return row?.c ?? 0;
}

async function checkTileServer(): Promise<{ url: string; healthy: boolean; status?: number }> {
  const url = process.env.TILE_SERVER_URL || "http://127.0.0.1:8080";
  try {
    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), 2500);
    const res = await fetch(url, { method: "HEAD", signal: controller.signal });
    clearTimeout(t);
    return { url, healthy: res.ok, status: res.status };
  } catch {
    return { url, healthy: false };
  }
}

export async function getDashboardMetrics(): Promise<DashboardMetrics> {
  const totalLocations = db.select({ c: sql<number>`count(*)` }).from(locations).get()?.c ?? 0;
  const totalSubmissions = db.select({ c: sql<number>`count(*)` }).from(submissions).get()?.c ?? 0;
  const totalDevices = db.select({ c: sql<number>`count(*)` }).from(devices).get()?.c ?? 0;
  const blockedDevices =
    db.select({ c: sql<number>`count(*)` }).from(devices).where(eq(devices.blocked, true)).get()?.c ?? 0;

  // Submissions per day for the last 14 days.
  const perDay = db
    .select({
      date: sql<string>`substr(${submissions.submittedAt}, 1, 10)`,
      count: sql<number>`count(*)`,
    })
    .from(submissions)
    .groupBy(sql`substr(${submissions.submittedAt}, 1, 10)`)
    .orderBy(sql`substr(${submissions.submittedAt}, 1, 10) desc`)
    .limit(14)
    .all();

  return {
    locations: {
      total: totalLocations,
      approved: countWhere(locations, locations.status, "approved"),
      archived: countWhere(locations, locations.status, "archived"),
    },
    submissions: {
      pending: countWhere(submissions, submissions.status, "pending"),
      approved: countWhere(submissions, submissions.status, "approved"),
      rejected: countWhere(submissions, submissions.status, "rejected"),
      total: totalSubmissions,
    },
    devices: { total: totalDevices, blocked: blockedDevices },
    perDay: perDay.reverse(),
    tileServer: await checkTileServer(),
  };
}

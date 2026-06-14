import { NextResponse } from "next/server";
import { desc } from "drizzle-orm";
import { isAdmin } from "@/lib/session";
import { db } from "@/lib/db";
import { devices } from "@/lib/schema";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const rows = db.select().from(devices).orderBy(desc(devices.lastSeen)).limit(200).all();
  return NextResponse.json({ devices: rows });
}

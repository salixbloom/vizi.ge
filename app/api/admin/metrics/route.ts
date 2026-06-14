import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/session";
import { getDashboardMetrics } from "@/lib/metrics";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  return NextResponse.json(await getDashboardMetrics());
}

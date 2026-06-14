import { NextRequest, NextResponse } from "next/server";
import { isAdmin } from "@/lib/session";
import { listSubmissions } from "@/lib/moderation";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// GET /api/admin/submissions?status=pending
export async function GET(req: NextRequest) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const status = req.nextUrl.searchParams.get("status") || undefined;
  return NextResponse.json({ submissions: listSubmissions(status) });
}

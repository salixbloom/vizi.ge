import { NextRequest, NextResponse } from "next/server";
import { getQuota } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

// GET /api/device/quota?deviceId=... -> remaining submissions today
export function GET(req: NextRequest) {
  const deviceId = req.nextUrl.searchParams.get("deviceId");
  if (!deviceId) {
    return NextResponse.json({ error: "deviceId required" }, { status: 400 });
  }
  return NextResponse.json(getQuota(deviceId));
}

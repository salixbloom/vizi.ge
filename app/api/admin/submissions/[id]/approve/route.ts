import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { isAdmin } from "@/lib/session";
import { approveSubmission } from "@/lib/moderation";

export const runtime = "nodejs";

const Body = z.object({
  lat: z.coerce.number().min(-90).max(90).optional(),
  lng: z.coerce.number().min(-180).max(180).optional(),
  label: z.string().max(200).nullish(),
  description: z.string().max(2000).nullish(),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  const parsed = Body.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid body" }, { status: 400 });
  }
  try {
    const locationId = approveSubmission(Number(id), parsed.data);
    return NextResponse.json({ ok: true, locationId });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "approve failed" },
      { status: 400 },
    );
  }
}

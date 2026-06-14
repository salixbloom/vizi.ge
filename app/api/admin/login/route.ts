import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/session";
import { verifyPassword } from "@/lib/password";

export const runtime = "nodejs";

const Body = z.object({ username: z.string(), password: z.string() });

export async function POST(req: NextRequest) {
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid body" }, { status: 400 });
  }
  const { username, password } = parsed.data;

  const expectedUser = process.env.ADMIN_USER;
  const expectedHash = process.env.ADMIN_PASS_HASH;
  if (!expectedUser || !expectedHash) {
    return NextResponse.json({ error: "admin not configured" }, { status: 500 });
  }

  if (username !== expectedUser || !verifyPassword(password, expectedHash)) {
    return NextResponse.json({ error: "invalid credentials" }, { status: 401 });
  }

  const session = await getSession();
  session.admin = true;
  session.username = username;
  await session.save();
  return NextResponse.json({ ok: true });
}

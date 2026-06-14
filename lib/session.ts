import { getIronSession, type SessionOptions } from "iron-session";
import { cookies } from "next/headers";

export interface SessionData {
  admin?: boolean;
  username?: string;
}

export const sessionOptions: SessionOptions = {
  password:
    process.env.SESSION_SECRET ||
    "dev-only-insecure-session-secret-change-me-32+",
  cookieName: "vizi_admin",
  cookieOptions: {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
  },
};

export async function getSession() {
  const cookieStore = await cookies();
  return getIronSession<SessionData>(cookieStore, sessionOptions);
}

/** True if the current request carries an authenticated admin session. */
export async function isAdmin(): Promise<boolean> {
  const session = await getSession();
  return session.admin === true;
}

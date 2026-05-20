import { NextResponse } from "next/server";
import { clearAuthCookies, clearSessionCookie } from "@/lib/session";

export const runtime = "nodejs";

export async function POST() {
  const response = NextResponse.json({ ok: true });
  clearAuthCookies(response);
  clearSessionCookie(response);
  return response;
}

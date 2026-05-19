import { NextRequest, NextResponse } from "next/server";
import { clearAuthCookies, clearSessionCookie } from "@/lib/session";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const response = NextResponse.redirect(new URL("/", request.url), { status: 303 });
  clearAuthCookies(response);
  clearSessionCookie(response);
  return response;
}

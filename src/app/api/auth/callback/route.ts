import { NextRequest, NextResponse } from "next/server";
import { exchangeCodeForToken, getRedirectUri } from "@/lib/spotify";
import {
  AUTH_STATE_COOKIE,
  AUTH_VERIFIER_COOKIE,
  clearAuthCookies,
  setSessionCookie,
} from "@/lib/session";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const error = request.nextUrl.searchParams.get("error");
  if (error) {
    return NextResponse.redirect(new URL(`/?error=${encodeURIComponent(error)}`, request.url));
  }

  const code = request.nextUrl.searchParams.get("code");
  const state = request.nextUrl.searchParams.get("state");
  const storedState = request.cookies.get(AUTH_STATE_COOKIE)?.value;
  const verifier = request.cookies.get(AUTH_VERIFIER_COOKIE)?.value;

  if (!code || !state || !storedState || !verifier || state !== storedState) {
    const response = NextResponse.redirect(new URL("/?error=invalid-auth-state", request.url));
    clearAuthCookies(response);
    return response;
  }

  try {
    const session = await exchangeCodeForToken({
      code,
      verifier,
      redirectUri: getRedirectUri(request),
    });
    const response = NextResponse.redirect(new URL("/", request.url));
    setSessionCookie(response, session);
    clearAuthCookies(response);
    return response;
  } catch {
    const response = NextResponse.redirect(new URL("/?error=spotify-token-exchange", request.url));
    clearAuthCookies(response);
    return response;
  }
}

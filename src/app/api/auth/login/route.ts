import { NextRequest, NextResponse } from "next/server";
import {
  buildAuthorizeUrl,
  generateState,
  generateVerifier,
  getRedirectUri,
  spotifyConfigured,
} from "@/lib/spotify";
import { setAuthCookies } from "@/lib/session";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  if (!spotifyConfigured()) {
    return NextResponse.redirect(
      new URL("/?error=missing-spotify-client-id", request.nextUrl.origin),
    );
  }

  const redirectUri = getRedirectUri(request);
  const redirectOrigin = new URL(redirectUri).origin;
  const requestOrigin = `${request.nextUrl.protocol}//${request.headers.get("host")}`;

  if (requestOrigin !== redirectOrigin) {
    return NextResponse.redirect(new URL(request.nextUrl.pathname, redirectOrigin));
  }

  const state = generateState();
  const verifier = generateVerifier();
  const response = NextResponse.redirect(
    buildAuthorizeUrl({
      state,
      verifier,
      redirectUri,
    }),
  );

  setAuthCookies(response, { state, verifier });
  return response;
}

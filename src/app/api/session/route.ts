import { NextRequest, NextResponse } from "next/server";
import { attachRefreshedSession, requireSpotifySession } from "@/lib/auth";
import { clearSessionCookie } from "@/lib/session";
import { fetchCurrentUser, spotifyConfigured } from "@/lib/spotify";
import { expandedGraphConfigured } from "@/lib/lastfm";
import type { ApiSessionResponse } from "@/lib/types";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const setupSteps: string[] = [];

  if (!spotifyConfigured()) {
    return NextResponse.json<ApiSessionResponse>({
      connected: false,
      spotifyConfigured: false,
      expandedGraphConfigured: expandedGraphConfigured(),
      setupSteps,
    });
  }

  try {
    const fresh = await requireSpotifySession(request);
    const profile = await fetchCurrentUser(fresh.session);
    const response = NextResponse.json<ApiSessionResponse>({
      connected: true,
      spotifyConfigured: true,
      expandedGraphConfigured: expandedGraphConfigured(),
      profile,
      expiresAt: fresh.session.expiresAt,
      setupSteps,
    });
    attachRefreshedSession(response, fresh);
    return response;
  } catch {
    const response = NextResponse.json<ApiSessionResponse>({
      connected: false,
      spotifyConfigured: true,
      expandedGraphConfigured: expandedGraphConfigured(),
      setupSteps,
    });
    clearSessionCookie(response);
    return response;
  }
}

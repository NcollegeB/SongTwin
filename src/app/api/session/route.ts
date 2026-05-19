import { NextRequest, NextResponse } from "next/server";
import { attachRefreshedSession, requireSpotifySession } from "@/lib/auth";
import { clearSessionCookie } from "@/lib/session";
import { fetchCurrentUser, spotifyConfigured } from "@/lib/spotify";
import { lastFmConfigured } from "@/lib/lastfm";
import type { ApiSessionResponse } from "@/lib/types";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const setupSteps = [
    !spotifyConfigured() ? "Add SPOTIFY_CLIENT_ID to .env.local." : "",
    !lastFmConfigured()
      ? "Add LASTFM_API_KEY to enable listener-overlap recommendations."
      : "",
  ].filter(Boolean);

  if (!spotifyConfigured()) {
    return NextResponse.json<ApiSessionResponse>({
      connected: false,
      spotifyConfigured: false,
      lastFmConfigured: lastFmConfigured(),
      setupSteps,
    });
  }

  try {
    const fresh = await requireSpotifySession(request);
    const profile = await fetchCurrentUser(fresh.session);
    const response = NextResponse.json<ApiSessionResponse>({
      connected: true,
      spotifyConfigured: true,
      lastFmConfigured: lastFmConfigured(),
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
      lastFmConfigured: lastFmConfigured(),
      setupSteps,
    });
    clearSessionCookie(response);
    return response;
  }
}

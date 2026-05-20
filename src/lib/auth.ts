import { NextRequest, NextResponse } from "next/server";
import { clearSessionCookie, getSessionFromRequest, setSessionCookie } from "./session";
import { refreshSpotifySession, SpotifyApiError } from "./spotify";
import type { SpotifyTokenSession } from "./types";

export class AuthError extends Error {
  status: number;

  constructor(message: string, status = 401) {
    super(message);
    this.name = "AuthError";
    this.status = status;
  }
}

export type FreshSession = {
  session: SpotifyTokenSession;
  refreshed: boolean;
};

export async function requireSpotifySession(request: NextRequest): Promise<FreshSession> {
  const session = getSessionFromRequest(request);
  if (!session) {
    throw new AuthError("Spotify account is not connected");
  }

  if (session.expiresAt > Date.now() + 60_000) {
    return { session, refreshed: false };
  }

  if (!session.refreshToken) {
    throw new AuthError("Spotify session expired");
  }

  const refreshed = await refreshSpotifySession(session.refreshToken);
  return { session: refreshed, refreshed: true };
}

export function attachRefreshedSession(response: NextResponse, fresh: FreshSession) {
  if (fresh.refreshed) {
    setSessionCookie(response, fresh.session);
  }
}

export function routeErrorResponse(error: unknown) {
  const status =
    error instanceof AuthError || error instanceof SpotifyApiError ? error.status : 500;
  if (error instanceof SpotifyApiError) {
    console.error("Spotify API error", {
      status: error.status,
      path: error.path,
      details: error.details,
    });
  }

  const response = NextResponse.json(
    {
      error: error instanceof Error ? error.message : "Unexpected server error",
    },
    { status },
  );

  if (status === 401) {
    clearSessionCookie(response);
  }

  return response;
}

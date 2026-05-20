import { NextRequest, NextResponse } from "next/server";
import { attachRefreshedSession, requireSpotifySession, routeErrorResponse } from "@/lib/auth";
import { requireActiveAccount } from "@/lib/account";
import { fetchCurrentUser, fetchReadablePlaylists } from "@/lib/spotify";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    await requireActiveAccount(request);
    const fresh = await requireSpotifySession(request);
    const profile = await fetchCurrentUser(fresh.session);
    const playlists = await fetchReadablePlaylists(fresh.session, profile.id);
    const response = NextResponse.json({ playlists });
    attachRefreshedSession(response, fresh);
    return response;
  } catch (error) {
    return routeErrorResponse(error);
  }
}

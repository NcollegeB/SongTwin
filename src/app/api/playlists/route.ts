import { NextRequest, NextResponse } from "next/server";
import { attachRefreshedSession, requireSpotifySession, routeErrorResponse } from "@/lib/auth";
import { fetchPlaylists } from "@/lib/spotify";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    const fresh = await requireSpotifySession(request);
    const playlists = await fetchPlaylists(fresh.session);
    const response = NextResponse.json({ playlists });
    attachRefreshedSession(response, fresh);
    return response;
  } catch (error) {
    return routeErrorResponse(error);
  }
}

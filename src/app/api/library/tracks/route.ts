import { NextRequest, NextResponse } from "next/server";
import { attachRefreshedSession, requireSpotifySession, routeErrorResponse } from "@/lib/auth";
import { fetchSavedTracks } from "@/lib/spotify";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    const fresh = await requireSpotifySession(request);
    const tracks = await fetchSavedTracks(fresh.session);
    const response = NextResponse.json({ tracks });
    attachRefreshedSession(response, fresh);
    return response;
  } catch (error) {
    return routeErrorResponse(error);
  }
}

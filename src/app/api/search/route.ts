import { NextRequest, NextResponse } from "next/server";
import { attachRefreshedSession, requireSpotifySession, routeErrorResponse } from "@/lib/auth";
import { requireActiveAccount } from "@/lib/account";
import { searchTracks } from "@/lib/spotify";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    const query = request.nextUrl.searchParams.get("q")?.trim();
    if (!query) {
      return NextResponse.json({ tracks: [] });
    }

    await requireActiveAccount(request);
    const fresh = await requireSpotifySession(request);
    const tracks = await searchTracks(fresh.session, query, 10);
    const response = NextResponse.json({ tracks });
    attachRefreshedSession(response, fresh);
    return response;
  } catch (error) {
    return routeErrorResponse(error);
  }
}

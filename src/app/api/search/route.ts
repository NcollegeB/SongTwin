import { NextRequest, NextResponse } from "next/server";
import { attachRefreshedSession, requireSpotifySession, routeErrorResponse } from "@/lib/auth";
import { requireActiveAccount } from "@/lib/account";
import { searchTracks } from "@/lib/spotify";
import { searchPublicCatalogTracks } from "@/lib/public-catalog";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    const query = request.nextUrl.searchParams.get("q")?.trim();
    if (!query) {
      return NextResponse.json({ tracks: [] });
    }

    await requireActiveAccount(request);
    const fresh = await requireSpotifySession(request).catch(() => null);
    const tracks = fresh
      ? await searchTracks(fresh.session, query, 10).catch(() => searchPublicCatalogTracks(query, 10))
      : await searchPublicCatalogTracks(query, 10);
    const response = NextResponse.json({ tracks });
    if (fresh) {
      attachRefreshedSession(response, fresh);
    }
    return response;
  } catch (error) {
    return routeErrorResponse(error);
  }
}

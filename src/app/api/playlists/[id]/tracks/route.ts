import { NextRequest, NextResponse } from "next/server";
import { attachRefreshedSession, requireSpotifySession, routeErrorResponse } from "@/lib/auth";
import { requireActiveAccount } from "@/lib/account";
import { fetchPlaylistTracks } from "@/lib/spotify";

export const runtime = "nodejs";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params;
    await requireActiveAccount(request);
    const fresh = await requireSpotifySession(request);
    const tracks = await fetchPlaylistTracks(fresh.session, id);
    const response = NextResponse.json({ tracks });
    attachRefreshedSession(response, fresh);
    return response;
  } catch (error) {
    return routeErrorResponse(error);
  }
}

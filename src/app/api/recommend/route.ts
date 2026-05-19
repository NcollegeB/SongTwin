import { NextRequest, NextResponse } from "next/server";
import { attachRefreshedSession, requireSpotifySession, routeErrorResponse } from "@/lib/auth";
import { recommendFromSeeds } from "@/lib/recommendations";
import type { SimplifiedTrack } from "@/lib/types";

export const runtime = "nodejs";

type RecommendBody = {
  seedTracks?: SimplifiedTrack[];
  limit?: number;
};

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as RecommendBody;
    const seedTracks = Array.isArray(body.seedTracks) ? body.seedTracks : [];
    const fresh = await requireSpotifySession(request);
    const payload = await recommendFromSeeds(fresh.session, seedTracks, {
      limit: body.limit ?? 24,
    });
    const response = NextResponse.json(payload);
    attachRefreshedSession(response, fresh);
    return response;
  } catch (error) {
    return routeErrorResponse(error);
  }
}

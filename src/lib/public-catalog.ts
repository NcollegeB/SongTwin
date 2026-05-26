import { searchExpandedGraphTracks } from "./lastfm";
import { searchMusicBrainzTracks } from "./listenbrainz";
import { trackKey } from "./track-utils";
import type { SimplifiedTrack } from "./types";

type PublicCatalogSearchTrack = {
  name: string;
  artistName: string;
  imageUrl?: string;
  sourceUrl?: string;
};

export function spotifySearchUrl(track: { name: string; artistName: string }) {
  return `https://open.spotify.com/search/${encodeURIComponent(`${track.name} ${track.artistName}`)}`;
}

export async function searchPublicCatalogTracks(query: string, limit = 10): Promise<SimplifiedTrack[]> {
  const safeLimit = Math.max(1, Math.min(limit, 20));
  const [expandedResults, musicBrainzResults] = await Promise.allSettled([
    searchExpandedGraphTracks(query, safeLimit),
    searchMusicBrainzTracks(query, safeLimit),
  ]);

  const tracks: PublicCatalogSearchTrack[] = [
    ...(expandedResults.status === "fulfilled" ? expandedResults.value : []),
    ...(musicBrainzResults.status === "fulfilled" ? musicBrainzResults.value : []),
  ];
  const seen = new Set<string>();
  const deduped: SimplifiedTrack[] = [];

  for (const track of tracks) {
    const simplified: SimplifiedTrack = {
      name: track.name,
      artistName: track.artistName,
      imageUrl: track.imageUrl,
      sourceUrl: track.sourceUrl,
      spotifyUrl: spotifySearchUrl(track),
    };
    const key = trackKey(simplified);
    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    deduped.push(simplified);
    if (deduped.length >= safeLimit) {
      break;
    }
  }

  return deduped;
}

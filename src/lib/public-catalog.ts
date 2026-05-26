import { searchMusicBrainzTracks } from "./listenbrainz";
import { trackKey } from "./track-utils";
import type { SimplifiedTrack } from "./types";

type PublicCatalogSearchTrack = {
  name: string;
  artistName: string;
  imageUrl?: string;
  sourceUrl?: string;
};

type AppleMusicSearchResponse = {
  results?: Array<{
    artistName?: string;
    artworkUrl100?: string;
    collectionName?: string;
    previewUrl?: string;
    trackName?: string;
    trackViewUrl?: string;
  }>;
};

export function spotifySearchUrl(track: { name: string; artistName: string }) {
  return `https://open.spotify.com/search/${encodeURIComponent(`${track.name} ${track.artistName}`)}`;
}

export async function searchPublicCatalogTracks(query: string, limit = 10): Promise<SimplifiedTrack[]> {
  const safeLimit = Math.max(1, Math.min(limit, 20));
  const [appleMusicResults, musicBrainzResults] = await Promise.allSettled([
    searchAppleMusicCatalogTracks(query, safeLimit),
    searchMusicBrainzTracks(query, safeLimit),
  ]);

  const tracks: PublicCatalogSearchTrack[] = [
    ...(appleMusicResults.status === "fulfilled" ? appleMusicResults.value : []),
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

export async function findPublicCatalogTrack(candidate: {
  name: string;
  artistName: string;
}) {
  const results = await searchAppleMusicCatalogTracks(
    `${candidate.name} ${candidate.artistName}`,
    5,
  );
  const candidateKey = trackKey(candidate);

  return (
    results.find((track) => trackKey(track) === candidateKey) ??
    results.find((track) => track.artistName.toLowerCase() === candidate.artistName.toLowerCase()) ??
    results[0] ??
    null
  );
}

async function searchAppleMusicCatalogTracks(query: string, limit: number): Promise<SimplifiedTrack[]> {
  const params = new URLSearchParams({
    term: query,
    media: "music",
    entity: "song",
    country: "US",
    limit: String(limit),
  });

  const response = await fetch(`https://itunes.apple.com/search?${params}`, {
    next: { revalidate: 60 * 60 * 12 },
  });

  if (!response.ok) {
    return [];
  }

  const data = (await response.json()) as AppleMusicSearchResponse;

  return (data.results ?? [])
    .map((track) => ({
      name: track.trackName ?? "",
      artistName: track.artistName ?? "",
      albumName: track.collectionName,
      imageUrl: upgradeAppleArtwork(track.artworkUrl100),
      sourceUrl: track.trackViewUrl,
      spotifyUrl: track.trackName && track.artistName ? spotifySearchUrl({
        name: track.trackName,
        artistName: track.artistName,
      }) : undefined,
    }))
    .filter((track) => Boolean(track.name && track.artistName));
}

function upgradeAppleArtwork(url?: string) {
  return url?.replace(/100x100bb\.(jpg|png|webp)$/i, "300x300bb.$1");
}

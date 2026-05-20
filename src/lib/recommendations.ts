import { searchBestTrack } from "./spotify";
import { getSimilarTracks, lastFmConfigured } from "./lastfm";
import { findMusicBrainzRecordingMbid, getListenBrainzSimilarTracks } from "./listenbrainz";
import type { RecommendationResponse, SimplifiedTrack, SpotifyTokenSession } from "./types";

type CandidateBucket = {
  name: string;
  artistName: string;
  score: number;
  supportSeeds: Set<string>;
  sourceUrl?: string;
  imageUrl?: string;
};

type RecommendationOptions = {
  limit?: number;
};

export async function recommendFromSeeds(
  session: SpotifyTokenSession,
  seedTracks: SimplifiedTrack[],
  options: RecommendationOptions = {},
): Promise<RecommendationResponse> {
  const seeds = dedupeTracks(seedTracks).slice(0, 10);
  const limit = options.limit ?? 24;
  const notes: string[] = [];

  if (seeds.length === 0) {
    return {
      recommendations: [],
      sourceSummary: {
        provider: "lastfm",
        lastFmConfigured: lastFmConfigured(),
        seedsAnalyzed: 0,
        spotifyMatches: 0,
        notes: ["No seed tracks were supplied."],
      },
    };
  }

  if (!lastFmConfigured()) {
    const listenBrainz = await listenBrainzRecommendations(session, seeds, limit);
    if (listenBrainz.length > 0) {
      return {
        recommendations: listenBrainz,
        sourceSummary: {
          provider: "listenbrainz",
          lastFmConfigured: false,
          seedsAnalyzed: Math.min(seeds.length, 4),
          spotifyMatches: listenBrainz.filter((track) => track.matchedOnSpotify).length,
          notes: [
            "Using ListenBrainz collaborative listening because LASTFM_API_KEY is not configured.",
          ],
        },
      };
    }

    return noCollaborativeMatches({
      provider: "listenbrainz",
      lastFmConfigured: false,
      seedsAnalyzed: Math.min(seeds.length, 4),
      notes: [
        "ListenBrainz returned no cross-artist co-listening matches for this seed.",
        "Add LASTFM_API_KEY for a larger listener-overlap graph.",
      ],
    });
  }

  const bucketMap = new Map<string, CandidateBucket>();
  const settled = await Promise.allSettled(
    seeds.map(async (seed, seedIndex) => {
      const similar = await getSimilarTracks({
        name: seed.name,
        artistName: primaryArtist(seed.artistName),
        limit: 35,
      });
      const maxMatch = Math.max(...similar.map((track) => track.match), 1);
      const seedWeight = Math.max(0.55, 1 - seedIndex * 0.05);

      for (const track of similar) {
        if (isSeed(track, seeds) || isSamePrimaryArtistAsAnySeed(track, seeds)) {
          continue;
        }

        const key = trackKey(track);
        const bucket =
          bucketMap.get(key) ??
          {
            name: track.name,
            artistName: track.artistName,
            score: 0,
            supportSeeds: new Set<string>(),
            sourceUrl: track.url,
            imageUrl: track.imageUrl,
          };

        bucket.score += (track.match / maxMatch) * seedWeight;
        bucket.supportSeeds.add(seed.name);
        bucketMap.set(key, bucket);
      }
    }),
  );

  const failures = settled.filter((result) => result.status === "rejected").length;
  if (failures > 0) {
    notes.push(`${failures} Last.fm seed lookups failed and were skipped.`);
  }

  if (bucketMap.size === 0) {
    const listenBrainz = await listenBrainzRecommendations(session, seeds, limit);
    if (listenBrainz.length > 0) {
      return {
        recommendations: listenBrainz,
        sourceSummary: {
          provider: "listenbrainz",
          lastFmConfigured: true,
          seedsAnalyzed: Math.min(seeds.length, 4),
          spotifyMatches: listenBrainz.filter((track) => track.matchedOnSpotify).length,
          notes: ["Last.fm returned no cross-artist candidates, so ListenBrainz was used."],
        },
      };
    }

    return noCollaborativeMatches({
      provider: "lastfm",
      lastFmConfigured: true,
      seedsAnalyzed: seeds.length,
      notes: [
        "Last.fm and ListenBrainz returned no cross-artist co-listening matches for this seed.",
        "SongTwin is not showing same-artist catalog filler because it is not listener-overlap data.",
      ],
    });
  }

  const rankedBuckets = [...bucketMap.values()].sort((left, right) => {
    return (
      right.score - left.score ||
      right.supportSeeds.size - left.supportSeeds.size ||
      left.name.localeCompare(right.name)
    );
  });

  const maxScore = rankedBuckets[0]?.score || 1;
  const mapped = await Promise.all(
    rankedBuckets.slice(0, Math.max(limit * 2, 30)).map(async (bucket) => {
      const spotifyTrack = await searchBestTrack(session, {
        name: bucket.name,
        artistName: bucket.artistName,
      }).catch(() => null);
      return { bucket, spotifyTrack };
    }),
  );

  const recommendations = mapped
    .map(({ bucket, spotifyTrack }) => {
      const track = spotifyTrack ?? {
        name: bucket.name,
        artistName: bucket.artistName,
        imageUrl: bucket.imageUrl,
        lastFmUrl: bucket.sourceUrl,
      };
      const normalizedScore = Math.round((bucket.score / maxScore) * 100);

      return {
        ...track,
        lastFmUrl: bucket.sourceUrl,
        score: normalizedScore,
        confidence: Math.min(97, Math.round(normalizedScore * 0.82 + bucket.supportSeeds.size * 6)),
        support: bucket.supportSeeds.size,
        signal: "lastfm-co-listening" as const,
        reason: "Last.fm listener-overlap candidate mapped back to Spotify catalog.",
        seedNames: [...bucket.supportSeeds],
        matchedOnSpotify: Boolean(spotifyTrack?.id),
      };
    })
    .filter((track) => !isSeed(track, seeds))
    .filter((track) => !isSamePrimaryArtistAsAnySeed(track, seeds))
    .slice(0, limit)
    .map((track, index) => ({ ...track, rank: index + 1 }));

  return {
    recommendations,
    sourceSummary: {
      provider: "lastfm",
      lastFmConfigured: true,
      seedsAnalyzed: seeds.length,
      spotifyMatches: recommendations.filter((track) => track.matchedOnSpotify).length,
      notes,
    },
  };
}

async function listenBrainzRecommendations(
  session: SpotifyTokenSession,
  seeds: SimplifiedTrack[],
  limit: number,
) {
  const seedMap = new Map<string, SimplifiedTrack>();

  for (const seed of seeds.slice(0, 4)) {
    const mbid = await findMusicBrainzRecordingMbid({
      name: seed.name,
      artistName: seed.artistName,
    }).catch(() => null);

    if (mbid) {
      seedMap.set(mbid, seed);
    }
  }

  const similar = await getListenBrainzSimilarTracks([...seedMap.keys()]).catch(() => []);
  if (similar.length === 0) {
    return [];
  }

  const bucketMap = new Map<
    string,
    {
      name: string;
      artistName: string;
      score: number;
      imageUrl?: string;
      supportSeeds: Set<string>;
    }
  >();

  for (const track of similar) {
    if (isSeed(track, seeds) || isSamePrimaryArtistAsAnySeed(track, seeds)) {
      continue;
    }

    const key = trackKey(track);
    const bucket =
      bucketMap.get(key) ??
      {
        name: track.name,
        artistName: track.artistName,
        score: 0,
        imageUrl: track.imageUrl,
        supportSeeds: new Set<string>(),
      };
    bucket.score += track.score;
    const seed = seedMap.get(track.seedMbid);
    if (seed) {
      bucket.supportSeeds.add(seed.name);
    }
    bucketMap.set(key, bucket);
  }

  const rankedBuckets = [...bucketMap.values()].sort((left, right) => {
    return (
      right.score - left.score ||
      right.supportSeeds.size - left.supportSeeds.size ||
      left.name.localeCompare(right.name)
    );
  });
  const maxScore = rankedBuckets[0]?.score || 1;

  const mapped = await Promise.all(
    rankedBuckets.slice(0, Math.max(limit * 2, 30)).map(async (bucket) => {
      const spotifyTrack = await searchBestTrack(session, {
        name: bucket.name,
        artistName: bucket.artistName,
      }).catch(() => null);
      return { bucket, spotifyTrack };
    }),
  );

  return mapped
    .map(({ bucket, spotifyTrack }) => {
      const track = spotifyTrack ?? {
        name: bucket.name,
        artistName: bucket.artistName,
        imageUrl: bucket.imageUrl,
      };
      const normalizedScore = Math.round((bucket.score / maxScore) * 100);

      return {
        ...track,
        score: normalizedScore,
        confidence: Math.min(95, Math.round(normalizedScore * 0.78 + bucket.supportSeeds.size * 8)),
        support: Math.max(bucket.supportSeeds.size, 1),
        signal: "listenbrainz-collaborative" as const,
        reason: "ListenBrainz collaborative listening candidate mapped back to Spotify catalog.",
        seedNames: [...bucket.supportSeeds],
        matchedOnSpotify: Boolean(spotifyTrack?.id),
      };
    })
    .filter((track) => !isSeed(track, seeds))
    .filter((track) => !isSamePrimaryArtistAsAnySeed(track, seeds))
    .slice(0, limit)
    .map((track, index) => ({ ...track, rank: index + 1 }));
}

function dedupeTracks(tracks: SimplifiedTrack[]) {
  const seen = new Set<string>();
  return tracks.filter((track) => {
    const key = trackKey(track);
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return Boolean(track.name && track.artistName);
  });
}

function isSeed(track: { name: string; artistName: string }, seeds: SimplifiedTrack[]) {
  return seeds.some((seed) => trackKey(track) === trackKey(seed));
}

function isSamePrimaryArtistAsAnySeed(
  track: { artistName: string },
  seeds: SimplifiedTrack[],
) {
  const artist = normalize(primaryArtist(track.artistName));
  return seeds.some((seed) => normalize(primaryArtist(seed.artistName)) === artist);
}

function noCollaborativeMatches(values: {
  provider: RecommendationResponse["sourceSummary"]["provider"];
  lastFmConfigured: boolean;
  seedsAnalyzed: number;
  notes: string[];
}): RecommendationResponse {
  return {
    recommendations: [],
    sourceSummary: {
      provider: values.provider,
      lastFmConfigured: values.lastFmConfigured,
      seedsAnalyzed: values.seedsAnalyzed,
      spotifyMatches: 0,
      notes: values.notes,
    },
  };
}

function trackKey(track: { name: string; artistName: string }) {
  return `${normalize(primaryArtist(track.artistName))}:${normalize(track.name)}`;
}

function normalize(value: string) {
  return value
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/\([^)]*\)/g, "")
    .replace(/\[[^\]]*\]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function primaryArtist(artistName: string) {
  return artistName.split(",")[0]?.trim() || artistName;
}

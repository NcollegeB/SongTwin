import { searchBestTrack } from "./spotify";
import { expandedGraphConfigured, getSimilarTracks } from "./lastfm";
import { findMusicBrainzRecordingMbid, getListenBrainzSimilarTracks } from "./listenbrainz";
import { findPublicCatalogTrack, spotifySearchUrl } from "./public-catalog";
import { primaryArtist, samePrimaryArtist, trackKey } from "./track-utils";
import type { RecommendationResponse, SimplifiedTrack, SpotifyTokenSession } from "./types";

type CandidateBucket = {
  name: string;
  artistName: string;
  score: number;
  supportSeeds: Set<string>;
  sourceUrl?: string;
  imageUrl?: string;
};

type RecommendationSignal = "expanded-graph" | "standard-graph";

type RecommendationBuildOptions = {
  signal: RecommendationSignal;
  reason: string;
  maxConfidence: number;
  confidenceWeight: number;
  supportWeight: number;
};

type RecommendationOptions = {
  limit?: number;
};

const MAX_RECOMMENDATION_SEEDS = 20;
const MAX_LISTENBRAINZ_SEEDS = 4;

export async function recommendFromSeeds(
  session: SpotifyTokenSession | null,
  seedTracks: SimplifiedTrack[],
  options: RecommendationOptions = {},
): Promise<RecommendationResponse> {
  const seeds = dedupeTracks(seedTracks).slice(0, MAX_RECOMMENDATION_SEEDS);
  const limit = options.limit ?? 24;
  const notes: string[] = [];

  if (seeds.length === 0) {
    return {
      recommendations: [],
      sourceSummary: {
        provider: "expanded",
        expandedGraphConfigured: expandedGraphConfigured(),
        seedsAnalyzed: 0,
        spotifyMatches: 0,
        notes: ["No seed tracks were supplied."],
      },
    };
  }

  if (!expandedGraphConfigured()) {
    const listenBrainz = await listenBrainzRecommendations(session, seeds, limit);
    if (listenBrainz.length > 0) {
      return {
        recommendations: listenBrainz,
        sourceSummary: {
          provider: "standard",
          expandedGraphConfigured: false,
          seedsAnalyzed: Math.min(seeds.length, MAX_LISTENBRAINZ_SEEDS),
          spotifyMatches: linkedTrackCount(listenBrainz),
          notes: ["Using SongTwin's standard public music graph for this run."],
        },
      };
    }

    return noStrongMatches({
      provider: "standard",
      expandedGraphConfigured: false,
      seedsAnalyzed: Math.min(seeds.length, MAX_LISTENBRAINZ_SEEDS),
      notes: [
        "SongTwin did not find strong cross-artist matches for the analyzed seeds.",
        "Try more source songs or a broader playlist to give the algorithm more signal.",
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
    notes.push(`${failures} source lookups failed and were skipped.`);
  }

  if (bucketMap.size === 0) {
    const listenBrainz = await listenBrainzRecommendations(session, seeds, limit);
    if (listenBrainz.length > 0) {
      return {
        recommendations: listenBrainz,
        sourceSummary: {
          provider: "standard",
          expandedGraphConfigured: true,
          seedsAnalyzed: Math.min(seeds.length, MAX_LISTENBRAINZ_SEEDS),
          spotifyMatches: linkedTrackCount(listenBrainz),
          notes: [
            "SongTwin used its public music graph after the expanded graph returned no strong cross-artist candidates.",
          ],
        },
      };
    }

    return noStrongMatches({
      provider: "expanded",
      expandedGraphConfigured: true,
      seedsAnalyzed: seeds.length,
      notes: [
        "SongTwin did not find strong cross-artist matches for the analyzed seeds.",
        "SongTwin is not showing same-artist catalog filler because it is not a strong fit signal.",
      ],
    });
  }

  const recommendations = await buildRecommendations(session, bucketMap, seeds, limit, {
    signal: "expanded-graph",
    reason: "Expanded music graph candidate mapped back to Spotify catalog.",
    maxConfidence: 97,
    confidenceWeight: 0.82,
    supportWeight: 6,
  });

  return {
    recommendations,
    sourceSummary: {
      provider: "expanded",
      expandedGraphConfigured: true,
      seedsAnalyzed: seeds.length,
      spotifyMatches: linkedTrackCount(recommendations),
      notes,
    },
  };
}

function linkedTrackCount(recommendations: Array<{ id?: string; spotifyUrl?: string }>) {
  return recommendations.filter((track) => Boolean(track.id || track.spotifyUrl)).length;
}

async function listenBrainzRecommendations(
  session: SpotifyTokenSession | null,
  seeds: SimplifiedTrack[],
  limit: number,
) {
  const seedMap = new Map<string, SimplifiedTrack>();

  for (const seed of seeds.slice(0, MAX_LISTENBRAINZ_SEEDS)) {
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

  return buildRecommendations(session, bucketMap, seeds, limit, {
    signal: "standard-graph",
    reason: "Public music graph candidate mapped back to Spotify catalog.",
    maxConfidence: 95,
    confidenceWeight: 0.78,
    supportWeight: 8,
  });
}

async function buildRecommendations(
  session: SpotifyTokenSession | null,
  bucketMap: Map<string, CandidateBucket>,
  seeds: SimplifiedTrack[],
  limit: number,
  options: RecommendationBuildOptions,
) {
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
      const spotifyTrack = session
        ? await searchBestTrack(session, {
            name: bucket.name,
            artistName: bucket.artistName,
          }).catch(() => null)
        : null;
      const publicTrack = !session
        ? await findPublicCatalogTrack({
            name: bucket.name,
            artistName: bucket.artistName,
          }).catch(() => null)
        : null;

      return { bucket, publicTrack, spotifyTrack };
    }),
  );

  return mapped
    .map(({ bucket, publicTrack, spotifyTrack }) => {
      const normalizedScore = Math.round((bucket.score / maxScore) * 100);
      const support = Math.max(bucket.supportSeeds.size, 1);
      const track = spotifyTrack ?? publicTrack ?? {
        name: bucket.name,
        artistName: bucket.artistName,
        imageUrl: bucket.imageUrl,
        spotifyUrl: spotifySearchUrl(bucket),
        sourceUrl: bucket.sourceUrl,
      };

      return {
        ...track,
        sourceUrl: bucket.sourceUrl ?? track.sourceUrl,
        score: normalizedScore,
        confidence: Math.min(
          options.maxConfidence,
          Math.round(normalizedScore * options.confidenceWeight + support * options.supportWeight),
        ),
        support,
        signal: options.signal,
        reason: options.reason,
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
  return seeds.some((seed) => samePrimaryArtist(track.artistName, seed.artistName));
}

function noStrongMatches(values: {
  provider: RecommendationResponse["sourceSummary"]["provider"];
  expandedGraphConfigured: boolean;
  seedsAnalyzed: number;
  notes: string[];
}): RecommendationResponse {
  return {
    recommendations: [],
    sourceSummary: {
      provider: values.provider,
      expandedGraphConfigured: values.expandedGraphConfigured,
      seedsAnalyzed: values.seedsAnalyzed,
      spotifyMatches: 0,
      notes: values.notes,
    },
  };
}

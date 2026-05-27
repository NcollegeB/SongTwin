import { searchBestTrack } from "./spotify";
import {
  expandedGraphConfigured,
  getArtistTopTracks,
  getSimilarArtists,
  getSimilarTracks,
} from "./lastfm";
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

type RankedCandidateBucket = CandidateBucket & {
  rankScore: number;
};

type RecommendationSignal = "expanded-graph" | "standard-graph" | "catalog-proximity";

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
const MAX_ARTIST_FALLBACK_SEEDS = 6;
const SIMILAR_ARTIST_FALLBACK_LIMIT = 8;
const TOP_TRACKS_PER_FALLBACK_ARTIST = 3;
const MAX_RECOMMENDATIONS_PER_ARTIST = 2;

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
        addCandidateBucket({
          bucketMap,
          candidate: {
            name: track.name,
            artistName: track.artistName,
            sourceUrl: track.url,
            imageUrl: track.imageUrl,
          },
          score: (track.match / maxMatch) * seedWeight,
          seedName: seed.name,
          seeds,
        });
      }
    }),
  );

  const failures = settled.filter((result) => result.status === "rejected").length;
  if (failures > 0) {
    notes.push(`${failures} source lookups failed and were skipped.`);
  }

  if (bucketMap.size > 0 && seeds.length > 1 && !hasSharedSupport(bucketMap)) {
    const fallbackBuckets = await artistFallbackBuckets(seeds);
    if (hasSharedSupport(fallbackBuckets)) {
      const recommendations = await buildRecommendations(session, fallbackBuckets, seeds, limit, {
        signal: "catalog-proximity",
        reason: "Common-ground catalog fit found from nearby cross-artist signals.",
        maxConfidence: 90,
        confidenceWeight: 0.72,
        supportWeight: 10,
      });

      return {
        recommendations,
        sourceSummary: {
          provider: "expanded",
          expandedGraphConfigured: true,
          seedsAnalyzed: Math.min(seeds.length, MAX_ARTIST_FALLBACK_SEEDS),
          spotifyMatches: linkedTrackCount(recommendations),
          notes: [
            ...notes,
            "Showing common-ground fits because direct matches were split across the source songs.",
          ],
        },
      };
    }
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

    const fallbackBuckets = await artistFallbackBuckets(seeds);
    if (fallbackBuckets.size > 0) {
      const recommendations = await buildRecommendations(session, fallbackBuckets, seeds, limit, {
        signal: "catalog-proximity",
        reason: "Closest cross-artist fit found after direct audience matches were sparse.",
        maxConfidence: 88,
        confidenceWeight: 0.7,
        supportWeight: 9,
      });

      return {
        recommendations,
        sourceSummary: {
          provider: "expanded",
          expandedGraphConfigured: true,
          seedsAnalyzed: Math.min(seeds.length, MAX_ARTIST_FALLBACK_SEEDS),
          spotifyMatches: linkedTrackCount(recommendations),
          notes: [
            ...notes,
            "Showing closest cross-artist fits because direct matches were sparse for this source.",
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

function addCandidateBucket(values: {
  bucketMap: Map<string, CandidateBucket>;
  candidate: {
    name: string;
    artistName: string;
    sourceUrl?: string;
    imageUrl?: string;
  };
  score: number;
  seedName: string;
  seeds: SimplifiedTrack[];
}) {
  if (
    isSeed(values.candidate, values.seeds) ||
    isSamePrimaryArtistAsAnySeed(values.candidate, values.seeds) ||
    isLiveVersion(values.candidate.name)
  ) {
    return;
  }

  const key = trackKey(values.candidate);
  const bucket =
    values.bucketMap.get(key) ??
    {
      name: values.candidate.name,
      artistName: values.candidate.artistName,
      score: 0,
      supportSeeds: new Set<string>(),
      sourceUrl: values.candidate.sourceUrl,
      imageUrl: values.candidate.imageUrl,
    };

  bucket.score += values.score;
  bucket.supportSeeds.add(values.seedName);
  bucket.sourceUrl ??= values.candidate.sourceUrl;
  bucket.imageUrl ??= values.candidate.imageUrl;
  values.bucketMap.set(key, bucket);
}

function isLiveVersion(trackName: string) {
  return /(?:^|[\s([{-])live(?:$|[\s)\]}-])/i.test(trackName);
}

function hasSharedSupport(bucketMap: Map<string, CandidateBucket>) {
  return [...bucketMap.values()].some((bucket) => bucket.supportSeeds.size > 1);
}

async function artistFallbackBuckets(seeds: SimplifiedTrack[]) {
  const bucketMap = new Map<string, CandidateBucket>();
  const topTracksByArtist = new Map<string, Promise<Awaited<ReturnType<typeof getArtistTopTracks>>>>();

  await Promise.allSettled(
    seeds.slice(0, MAX_ARTIST_FALLBACK_SEEDS).map(async (seed, seedIndex) => {
      const similarArtists = await getSimilarArtists({
        artistName: primaryArtist(seed.artistName),
        limit: SIMILAR_ARTIST_FALLBACK_LIMIT,
      }).catch(() => []);
      const maxArtistMatch = Math.max(...similarArtists.map((artist) => artist.match), 1);
      const seedWeight = Math.max(0.6, 1 - seedIndex * 0.06);

      await Promise.allSettled(
        similarArtists.map(async (artist, artistIndex) => {
          if (isSamePrimaryArtistAsAnySeed({ artistName: artist.name }, seeds)) {
            return;
          }

          const artistKey = primaryArtist(artist.name).toLowerCase();
          const cachedTracks =
            topTracksByArtist.get(artistKey) ??
            getArtistTopTracks({
              artistName: artist.name,
              limit: TOP_TRACKS_PER_FALLBACK_ARTIST,
            }).catch(() => []);

          topTracksByArtist.set(artistKey, cachedTracks);
          const topTracks = await cachedTracks;
          const artistFit = artist.match / maxArtistMatch;
          const artistRankWeight = Math.max(0.55, 1 - artistIndex * 0.06);

          topTracks.forEach((track, trackIndex) => {
            const trackRankWeight = Math.max(0.45, 1 - trackIndex * 0.16);
            addCandidateBucket({
              bucketMap,
              candidate: {
                name: track.name,
                artistName: track.artistName,
                sourceUrl: track.url ?? artist.url,
                imageUrl: track.imageUrl ?? artist.imageUrl,
              },
              score: artistFit * artistRankWeight * trackRankWeight * seedWeight,
              seedName: seed.name,
              seeds,
            });
          });
        }),
      );
    }),
  );

  return bucketMap;
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
  const rankedBuckets = rankCandidateBuckets(bucketMap, seeds.length);
  const maxScore = rankedBuckets[0]?.rankScore || 1;

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

      return {
        bucket,
        publicTrack: isUsableMappedTrack(publicTrack, seeds) ? publicTrack : null,
        spotifyTrack: isUsableMappedTrack(spotifyTrack, seeds) ? spotifyTrack : null,
      };
    }),
  );

  const filtered = mapped
    .map(({ bucket, publicTrack, spotifyTrack }) => {
      const normalizedScore = Math.round((bucket.rankScore / maxScore) * 100);
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
    .filter((track) => !isSamePrimaryArtistAsAnySeed(track, seeds));

  return limitRepeatedArtists(filtered, limit)
    .slice(0, limit)
    .map((track, index) => ({ ...track, rank: index + 1 }));
}

function limitRepeatedArtists<T extends { artistName: string }>(tracks: T[], limit: number) {
  const artistCounts = new Map<string, number>();
  const limited: T[] = [];
  const overflow: T[] = [];

  for (const track of tracks) {
    const artistKey = primaryArtist(track.artistName).toLowerCase();
    const count = artistCounts.get(artistKey) ?? 0;

    if (count < MAX_RECOMMENDATIONS_PER_ARTIST) {
      artistCounts.set(artistKey, count + 1);
      limited.push(track);
    } else {
      overflow.push(track);
    }
  }

  return limited.length >= limit ? limited : [...limited, ...overflow];
}

function isUsableMappedTrack(
  track: SimplifiedTrack | null,
  seeds: SimplifiedTrack[],
): track is SimplifiedTrack {
  return Boolean(
    track &&
      !isSeed(track, seeds) &&
      !isSamePrimaryArtistAsAnySeed(track, seeds) &&
      !isLiveVersion(track.name),
  );
}

function rankCandidateBuckets(
  bucketMap: Map<string, CandidateBucket>,
  seedCount: number,
): RankedCandidateBucket[] {
  const buckets = [...bucketMap.values()];
  const maxRawScore = Math.max(...buckets.map((bucket) => bucket.score), 1);

  return buckets
    .map((bucket) => {
      const support = Math.max(bucket.supportSeeds.size, 1);
      const normalizedRawScore = bucket.score / maxRawScore;
      const multiSeedBoost =
        seedCount > 1 ? support * 1.25 + (support > 1 ? 2.25 : 0) : 0;

      return {
        ...bucket,
        rankScore: normalizedRawScore + multiSeedBoost,
      };
    })
    .sort((left, right) => {
      return (
        right.rankScore - left.rankScore ||
        right.supportSeeds.size - left.supportSeeds.size ||
        right.score - left.score ||
        left.name.localeCompare(right.name)
      );
    });
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

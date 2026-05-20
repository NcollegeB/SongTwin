export type ListenBrainzSimilarTrack = {
  name: string;
  artistName: string;
  score: number;
  mbid: string;
  seedMbid: string;
  imageUrl?: string;
};

type MusicBrainzRecording = {
  id: string;
  title?: string;
  score?: number;
  disambiguation?: string;
  "artist-credit"?: Array<{
    name?: string;
  }>;
};

type MusicBrainzSearchResponse = {
  recordings?: MusicBrainzRecording[];
};

type ListenBrainzSimilarResponse = Array<{
  recording_mbid?: string;
  recording_name?: string;
  artist_credit_name?: string;
  score?: number;
  reference_mbid?: string;
  caa_id?: number;
  caa_release_mbid?: string;
}>;

const LISTENBRAINZ_ALGORITHMS = [
  "session_based_days_7500_session_300_contribution_5_threshold_15_limit_50_skip_30_top_n_listeners_1000",
  "session_based_days_7500_session_300_contribution_sqrt_threshold_15_limit_50_skip_30_top_n_listeners_1000",
  "session_based_listens_session_300_contribution_5_threshold_15_limit_50_skip_30",
];

export async function findMusicBrainzRecordingMbid(values: {
  name: string;
  artistName: string;
}) {
  const params = new URLSearchParams({
    query: `recording:"${values.name}" AND artist:"${primaryArtist(values.artistName)}"`,
    fmt: "json",
    limit: "8",
  });

  const response = await fetch(`https://musicbrainz.org/ws/2/recording/?${params}`, {
    headers: {
      "User-Agent": process.env.MUSICBRAINZ_USER_AGENT || "SongTwin/0.1 (local development)",
    },
    next: { revalidate: 60 * 60 * 24 * 14 },
  });

  if (!response.ok) {
    return null;
  }

  const data = (await response.json()) as MusicBrainzSearchResponse;
  const recordings = data.recordings ?? [];
  const normalizedName = normalize(values.name);
  const normalizedArtist = normalize(primaryArtist(values.artistName));

  const exact = recordings.find((recording) => {
    const recordingArtist = recording["artist-credit"]?.map((artist) => artist.name).join(" ") ?? "";
    const disambiguation = normalize(recording.disambiguation ?? "");
    return (
      normalize(recording.title ?? "") === normalizedName &&
      normalize(recordingArtist).includes(normalizedArtist) &&
      !disambiguation.includes("live")
    );
  });

  return exact?.id ?? recordings[0]?.id ?? null;
}

export async function getListenBrainzSimilarTracks(seedMbids: string[]) {
  if (seedMbids.length === 0) {
    return [];
  }

  const settled = await Promise.allSettled(
    LISTENBRAINZ_ALGORITHMS.map((algorithm) => fetchSimilarTracks(seedMbids, algorithm)),
  );

  return settled
    .flatMap((result) => (result.status === "fulfilled" ? result.value : []))
    .filter((track) => Boolean(track.name && track.artistName && track.mbid));
}

async function fetchSimilarTracks(seedMbids: string[], algorithm: string) {
  const params = new URLSearchParams({
    recording_mbids: seedMbids.join(","),
    algorithm,
  });

  const response = await fetch(`https://labs.api.listenbrainz.org/similar-recordings/json?${params}`, {
    next: { revalidate: 60 * 60 * 24 },
  });

  if (!response.ok) {
    return [];
  }

  const data = (await response.json()) as ListenBrainzSimilarResponse;

  return data
    .map<ListenBrainzSimilarTrack>((track) => ({
      name: track.recording_name ?? "",
      artistName: track.artist_credit_name ?? "",
      score: Number(track.score ?? 0),
      mbid: track.recording_mbid ?? "",
      seedMbid: track.reference_mbid ?? "",
      imageUrl:
        track.caa_release_mbid && track.caa_id
          ? `https://coverartarchive.org/release/${track.caa_release_mbid}/${track.caa_id}-250.jpg`
          : undefined,
    }))
    .filter((track) => Boolean(track.name && track.artistName && track.mbid));
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

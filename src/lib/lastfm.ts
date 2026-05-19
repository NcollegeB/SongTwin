export type LastFmSimilarTrack = {
  name: string;
  artistName: string;
  match: number;
  url?: string;
  imageUrl?: string;
};

type LastFmImage = {
  "#text"?: string;
  size?: string;
};

type LastFmTrackResponse = {
  name?: string;
  match?: string | number;
  url?: string;
  artist?: {
    name?: string;
  };
  image?: LastFmImage[];
};

type LastFmSimilarResponse = {
  similartracks?: {
    track?: LastFmTrackResponse[] | LastFmTrackResponse;
  };
  error?: number;
  message?: string;
};

export function lastFmConfigured() {
  return Boolean(process.env.LASTFM_API_KEY);
}

export async function getSimilarTracks(values: {
  name: string;
  artistName: string;
  limit?: number;
}) {
  const apiKey = process.env.LASTFM_API_KEY;
  if (!apiKey) {
    return [];
  }

  const params = new URLSearchParams({
    method: "track.getsimilar",
    artist: values.artistName,
    track: values.name,
    api_key: apiKey,
    format: "json",
    autocorrect: "1",
    limit: String(values.limit ?? 30),
  });

  const response = await fetch(`https://ws.audioscrobbler.com/2.0/?${params}`, {
    next: { revalidate: 60 * 60 * 12 },
  });

  if (!response.ok) {
    throw new Error(`Last.fm request failed with status ${response.status}`);
  }

  const data = (await response.json()) as LastFmSimilarResponse;
  if (data.error) {
    throw new Error(data.message || `Last.fm returned error ${data.error}`);
  }

  const trackList = Array.isArray(data.similartracks?.track)
    ? data.similartracks?.track
    : data.similartracks?.track
      ? [data.similartracks.track]
      : [];

  return trackList
    .map<LastFmSimilarTrack>((track) => ({
      name: track.name ?? "",
      artistName: track.artist?.name ?? "",
      match: Number(track.match ?? 0),
      url: track.url,
      imageUrl: track.image?.find((image) => image.size === "large")?.["#text"],
    }))
    .filter((track): track is LastFmSimilarTrack => Boolean(track.name && track.artistName));
}

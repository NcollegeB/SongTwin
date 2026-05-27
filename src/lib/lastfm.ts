export type LastFmSimilarTrack = {
  name: string;
  artistName: string;
  match: number;
  url?: string;
  imageUrl?: string;
};

export type LastFmSimilarArtist = {
  name: string;
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
  artist?:
    | string
    | {
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

type LastFmArtistResponse = {
  name?: string;
  match?: string | number;
  url?: string;
  image?: LastFmImage[];
};

type LastFmSimilarArtistsResponse = {
  similarartists?: {
    artist?: LastFmArtistResponse[] | LastFmArtistResponse;
  };
  error?: number;
  message?: string;
};

type LastFmTopTracksResponse = {
  toptracks?: {
    track?: LastFmTrackResponse[] | LastFmTrackResponse;
  };
  error?: number;
  message?: string;
};

export function expandedGraphConfigured() {
  return Boolean(process.env.SONGTWIN_GRAPH_API_KEY ?? process.env.LASTFM_API_KEY);
}

export async function getSimilarTracks(values: {
  name: string;
  artistName: string;
  limit?: number;
}) {
  const apiKey = process.env.SONGTWIN_GRAPH_API_KEY ?? process.env.LASTFM_API_KEY;
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
    throw new Error(`Expanded graph request failed with status ${response.status}`);
  }

  const data = (await response.json()) as LastFmSimilarResponse;
  if (data.error) {
    throw new Error(data.message || `Expanded graph returned error ${data.error}`);
  }

  const trackList = Array.isArray(data.similartracks?.track)
    ? data.similartracks?.track
    : data.similartracks?.track
      ? [data.similartracks.track]
      : [];

  return trackList
    .map<LastFmSimilarTrack>((track) => ({
      name: track.name ?? "",
      artistName:
        typeof track.artist === "string"
          ? track.artist
          : track.artist?.name ?? "",
      match: Number(track.match ?? 0),
      url: track.url,
      imageUrl: track.image?.find((image) => image.size === "large")?.["#text"],
    }))
    .filter((track): track is LastFmSimilarTrack => Boolean(track.name && track.artistName));
}

export async function getSimilarArtists(values: {
  artistName: string;
  limit?: number;
}) {
  const apiKey = process.env.SONGTWIN_GRAPH_API_KEY ?? process.env.LASTFM_API_KEY;
  if (!apiKey) {
    return [];
  }

  const params = new URLSearchParams({
    method: "artist.getsimilar",
    artist: values.artistName,
    api_key: apiKey,
    format: "json",
    autocorrect: "1",
    limit: String(values.limit ?? 12),
  });

  const response = await fetch(`https://ws.audioscrobbler.com/2.0/?${params}`, {
    next: { revalidate: 60 * 60 * 24 },
  });

  if (!response.ok) {
    throw new Error(`Expanded artist graph request failed with status ${response.status}`);
  }

  const data = (await response.json()) as LastFmSimilarArtistsResponse;
  if (data.error) {
    throw new Error(data.message || `Expanded artist graph returned error ${data.error}`);
  }

  const artistList = Array.isArray(data.similarartists?.artist)
    ? data.similarartists?.artist
    : data.similarartists?.artist
      ? [data.similarartists.artist]
      : [];

  return artistList
    .map<LastFmSimilarArtist>((artist) => ({
      name: artist.name ?? "",
      match: Number(artist.match ?? 0),
      url: artist.url,
      imageUrl: artist.image?.find((image) => image.size === "large")?.["#text"],
    }))
    .filter((artist): artist is LastFmSimilarArtist => Boolean(artist.name));
}

export async function getArtistTopTracks(values: {
  artistName: string;
  limit?: number;
}) {
  const apiKey = process.env.SONGTWIN_GRAPH_API_KEY ?? process.env.LASTFM_API_KEY;
  if (!apiKey) {
    return [];
  }

  const params = new URLSearchParams({
    method: "artist.gettoptracks",
    artist: values.artistName,
    api_key: apiKey,
    format: "json",
    autocorrect: "1",
    limit: String(values.limit ?? 3),
  });

  const response = await fetch(`https://ws.audioscrobbler.com/2.0/?${params}`, {
    next: { revalidate: 60 * 60 * 24 },
  });

  if (!response.ok) {
    throw new Error(`Expanded artist track request failed with status ${response.status}`);
  }

  const data = (await response.json()) as LastFmTopTracksResponse;
  if (data.error) {
    throw new Error(data.message || `Expanded artist track graph returned error ${data.error}`);
  }

  const trackList = Array.isArray(data.toptracks?.track)
    ? data.toptracks?.track
    : data.toptracks?.track
      ? [data.toptracks.track]
      : [];

  return trackList
    .map<LastFmSimilarTrack>((track) => ({
      name: track.name ?? "",
      artistName:
        typeof track.artist === "string"
          ? track.artist
          : track.artist?.name ?? values.artistName,
      match: Number(track.match ?? 0),
      url: track.url,
      imageUrl: track.image?.find((image) => image.size === "large")?.["#text"],
    }))
    .filter((track): track is LastFmSimilarTrack => Boolean(track.name && track.artistName));
}

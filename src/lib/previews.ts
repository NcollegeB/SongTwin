import type { SimplifiedTrack } from "./types";
import { normalizeTrackText, primaryArtist, similarArtistName } from "./track-utils";

type AppleSearchResult = {
  trackName?: string;
  artistName?: string;
  previewUrl?: string;
};

type AppleSearchResponse = {
  results?: AppleSearchResult[];
};

export async function addPublicPreviewFallbacks<T extends SimplifiedTrack>(
  tracks: T[],
): Promise<T[]> {
  return Promise.all(
    tracks.map(async (track) => {
      if (track.previewUrl) {
        return track;
      }

      const previewUrl = await findPublicPreviewUrl(track).catch(() => undefined);
      return previewUrl ? { ...track, previewUrl } : track;
    }),
  );
}

async function findPublicPreviewUrl(track: SimplifiedTrack) {
  const artist = primaryArtist(track.artistName);
  const params = new URLSearchParams({
    media: "music",
    entity: "song",
    limit: "5",
    term: `${track.name} ${artist}`,
  });

  const response = await fetch(`https://itunes.apple.com/search?${params}`, {
    headers: {
      Accept: "application/json",
    },
    next: {
      revalidate: 60 * 60 * 24 * 7,
    },
  });

  if (!response.ok) {
    return undefined;
  }

  const data = (await response.json()) as AppleSearchResponse;
  const normalizedTrackName = normalizeTrackText(track.name);

  const match = data.results?.find((result) => {
    if (!result.trackName || !result.artistName || !result.previewUrl) {
      return false;
    }

    const candidateName = normalizeTrackText(result.trackName);
    const sameTrack =
      candidateName === normalizedTrackName ||
      candidateName.includes(normalizedTrackName) ||
      normalizedTrackName.includes(candidateName);

    return sameTrack && similarArtistName(result.artistName, track.artistName);
  });

  return match?.previewUrl;
}

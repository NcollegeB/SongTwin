export type TrackIdentity = {
  name: string;
  artistName: string;
};

export function primaryArtist(artistName: string) {
  return (
    artistName
      .split(",")[0]
      ?.split(/\s+(?:feat\.?|ft\.?|featuring|with)\s+/i)[0]
      ?.trim() || artistName
  );
}

export function normalizeTrackText(value: string) {
  return value
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/\([^)]*\)/g, "")
    .replace(/\[[^\]]*\]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export function trackKey(track: TrackIdentity) {
  return `${normalizeTrackText(primaryArtist(track.artistName))}:${normalizeTrackText(track.name)}`;
}

export function samePrimaryArtist(left: string, right: string) {
  return normalizeTrackText(primaryArtist(left)) === normalizeTrackText(primaryArtist(right));
}

export function similarArtistName(left: string, right: string) {
  const leftValue = normalizeTrackText(left);
  const rightValue = normalizeTrackText(right);
  return leftValue.includes(rightValue) || rightValue.includes(leftValue);
}

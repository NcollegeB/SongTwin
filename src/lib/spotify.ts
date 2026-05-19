import { createHash, randomBytes } from "node:crypto";
import type { NextRequest } from "next/server";
import type {
  PlaylistSummary,
  SimplifiedTrack,
  SpotifyProfile,
  SpotifyTokenSession,
} from "./types";

const SPOTIFY_API_BASE = "https://api.spotify.com/v1";
const SPOTIFY_ACCOUNTS_BASE = "https://accounts.spotify.com";

const SCOPES = [
  "user-read-email",
  "user-read-private",
  "playlist-read-private",
  "playlist-read-collaborative",
  "user-library-read",
];

type SpotifyImage = {
  url: string;
  height?: number;
  width?: number;
};

type SpotifyArtist = {
  id?: string;
  name: string;
};

type SpotifyTrack = {
  id?: string;
  name: string;
  duration_ms?: number;
  popularity?: number;
  is_local?: boolean;
  external_urls?: { spotify?: string };
  artists?: SpotifyArtist[];
  album?: {
    name?: string;
    images?: SpotifyImage[];
  };
};

type SpotifyPaging<T> = {
  items: T[];
  next?: string | null;
};

type SpotifyPlaylistItem = {
  id: string;
  name: string;
  images?: SpotifyImage[];
  owner?: { display_name?: string; id?: string };
  tracks?: { total?: number };
  external_urls?: { spotify?: string };
};

type SpotifyPlaylistTrackItem = {
  track?: SpotifyTrack | null;
};

type TokenResponse = {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  scope?: string;
  token_type?: string;
};

export class SpotifyApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "SpotifyApiError";
    this.status = status;
  }
}

export function spotifyConfigured() {
  return Boolean(process.env.SPOTIFY_CLIENT_ID);
}

export function getRedirectUri(request: NextRequest) {
  return process.env.SPOTIFY_REDIRECT_URI ?? `${request.nextUrl.origin}/api/auth/callback`;
}

function requireClientId() {
  const clientId = process.env.SPOTIFY_CLIENT_ID;
  if (!clientId) {
    throw new Error("SPOTIFY_CLIENT_ID is not configured");
  }
  return clientId;
}

export function generateVerifier() {
  return randomBytes(64).toString("base64url").slice(0, 96);
}

export function generateState() {
  return randomBytes(24).toString("base64url");
}

export function challengeForVerifier(verifier: string) {
  return createHash("sha256").update(verifier).digest("base64url");
}

export function buildAuthorizeUrl(values: {
  state: string;
  verifier: string;
  redirectUri: string;
}) {
  const url = new URL(`${SPOTIFY_ACCOUNTS_BASE}/authorize`);
  url.search = new URLSearchParams({
    response_type: "code",
    client_id: requireClientId(),
    scope: SCOPES.join(" "),
    redirect_uri: values.redirectUri,
    state: values.state,
    code_challenge_method: "S256",
    code_challenge: challengeForVerifier(values.verifier),
  }).toString();

  return url;
}

export async function exchangeCodeForToken(values: {
  code: string;
  verifier: string;
  redirectUri: string;
}) {
  const response = await fetch(`${SPOTIFY_ACCOUNTS_BASE}/api/token`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      client_id: requireClientId(),
      grant_type: "authorization_code",
      code: values.code,
      redirect_uri: values.redirectUri,
      code_verifier: values.verifier,
    }),
  });

  if (!response.ok) {
    throw new SpotifyApiError("Spotify token exchange failed", response.status);
  }

  const token = (await response.json()) as TokenResponse;
  return tokenToSession(token);
}

export async function refreshSpotifySession(refreshToken: string) {
  const response = await fetch(`${SPOTIFY_ACCOUNTS_BASE}/api/token`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      client_id: requireClientId(),
      grant_type: "refresh_token",
      refresh_token: refreshToken,
    }),
  });

  if (!response.ok) {
    throw new SpotifyApiError("Spotify token refresh failed", response.status);
  }

  const token = (await response.json()) as TokenResponse;
  return tokenToSession({ ...token, refresh_token: token.refresh_token ?? refreshToken });
}

function tokenToSession(token: TokenResponse): SpotifyTokenSession {
  return {
    accessToken: token.access_token,
    refreshToken: token.refresh_token,
    expiresAt: Date.now() + Math.max(token.expires_in - 60, 30) * 1000,
    scope: token.scope,
    tokenType: token.token_type,
    connectedAt: Date.now(),
  };
}

export async function spotifyFetch<T>(
  session: SpotifyTokenSession,
  pathOrUrl: string,
  init?: RequestInit,
) {
  const url = pathOrUrl.startsWith("http")
    ? pathOrUrl
    : `${SPOTIFY_API_BASE}${pathOrUrl}`;
  const response = await fetch(url, {
    ...init,
    headers: {
      ...init?.headers,
      Authorization: `Bearer ${session.accessToken}`,
    },
  });

  if (!response.ok) {
    throw new SpotifyApiError(`Spotify API request failed: ${pathOrUrl}`, response.status);
  }

  return (await response.json()) as T;
}

export async function fetchCurrentUser(session: SpotifyTokenSession): Promise<SpotifyProfile> {
  const data = await spotifyFetch<{
    id: string;
    display_name?: string;
    email?: string;
    images?: SpotifyImage[];
    external_urls?: { spotify?: string };
  }>(session, "/me");

  return {
    id: data.id,
    displayName: data.display_name || data.id,
    email: data.email,
    imageUrl: bestImage(data.images),
    spotifyUrl: data.external_urls?.spotify,
  };
}

export async function fetchPlaylists(session: SpotifyTokenSession) {
  const playlists: PlaylistSummary[] = [];
  let next: string | null | undefined = "/me/playlists?limit=50";

  while (next && playlists.length < 200) {
    const page: SpotifyPaging<SpotifyPlaylistItem> = await spotifyFetch(session, next);
    playlists.push(
      ...page.items.map((playlist) => ({
        id: playlist.id,
        name: playlist.name,
        owner: playlist.owner?.display_name || playlist.owner?.id || "Spotify",
        totalTracks: playlist.tracks?.total ?? 0,
        imageUrl: bestImage(playlist.images),
        spotifyUrl: playlist.external_urls?.spotify,
      })),
    );
    next = page.next;
  }

  return playlists;
}

export async function fetchPlaylistTracks(session: SpotifyTokenSession, playlistId: string) {
  const tracks: SimplifiedTrack[] = [];
  let next: string | null | undefined =
    `/playlists/${encodeURIComponent(playlistId)}/tracks?limit=100&fields=items(track(id,name,duration_ms,popularity,is_local,external_urls,artists(id,name),album(name,images))),next`;

  while (next && tracks.length < 300) {
    const page: SpotifyPaging<SpotifyPlaylistTrackItem> = await spotifyFetch(session, next);
    tracks.push(
      ...page.items
        .map((item) => item.track)
        .filter((track): track is SpotifyTrack => Boolean(track && !track.is_local))
        .map(simplifyTrack),
    );
    next = page.next;
  }

  return tracks;
}

export async function searchTracks(session: SpotifyTokenSession, query: string, limit = 12) {
  const params = new URLSearchParams({
    q: query,
    type: "track",
    limit: String(limit),
    market: "from_token",
  });

  const data = await spotifyFetch<{ tracks: SpotifyPaging<SpotifyTrack> }>(
    session,
    `/search?${params}`,
  );

  return data.tracks.items.map(simplifyTrack);
}

export async function searchBestTrack(
  session: SpotifyTokenSession,
  candidate: { name: string; artistName: string },
) {
  const tracks = await searchTracks(
    session,
    `track:${candidate.name} artist:${candidate.artistName}`,
    5,
  );

  return (
    tracks.find((track) => isLikelySameTrack(track, candidate)) ??
    tracks.find((track) => sameArtist(track.artistName, candidate.artistName)) ??
    tracks[0] ??
    null
  );
}

export async function fetchArtistTopTracks(session: SpotifyTokenSession, artistId: string) {
  const data = await spotifyFetch<{ tracks: SpotifyTrack[] }>(
    session,
    `/artists/${encodeURIComponent(artistId)}/top-tracks?market=from_token`,
  );
  return data.tracks.map(simplifyTrack);
}

export function simplifyTrack(track: SpotifyTrack): SimplifiedTrack {
  const firstArtist = track.artists?.[0];

  return {
    id: track.id,
    name: track.name,
    artistName: track.artists?.map((artist) => artist.name).join(", ") || "Unknown artist",
    artistId: firstArtist?.id,
    albumName: track.album?.name,
    imageUrl: bestImage(track.album?.images),
    spotifyUrl: track.external_urls?.spotify,
    durationMs: track.duration_ms,
    popularity: track.popularity,
  };
}

function bestImage(images?: SpotifyImage[]) {
  return images?.[0]?.url;
}

function comparable(value: string) {
  return value
    .toLowerCase()
    .replace(/\([^)]*\)/g, "")
    .replace(/\[[^\]]*\]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function sameArtist(left: string, right: string) {
  const leftValue = comparable(left);
  const rightValue = comparable(right);
  return leftValue.includes(rightValue) || rightValue.includes(leftValue);
}

function isLikelySameTrack(track: SimplifiedTrack, candidate: { name: string; artistName: string }) {
  const trackName = comparable(track.name);
  const candidateName = comparable(candidate.name);
  return (
    (trackName === candidateName ||
      trackName.includes(candidateName) ||
      candidateName.includes(trackName)) &&
    sameArtist(track.artistName, candidate.artistName)
  );
}

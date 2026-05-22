import { createHash, randomBytes } from "node:crypto";
import type { NextRequest } from "next/server";
import type {
  PlaylistSummary,
  SimplifiedTrack,
  SpotifyProfile,
  SpotifyTokenSession,
} from "./types";
import { addPublicPreviewFallbacks } from "./previews";
import { normalizeTrackText, similarArtistName } from "./track-utils";

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
  preview_url?: string | null;
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
  total?: number;
};

type SpotifyPlaylistItem = {
  id: string;
  name: string;
  collaborative?: boolean;
  images?: SpotifyImage[];
  owner?: { display_name?: string; id?: string };
  tracks?: { total?: number };
  external_urls?: { spotify?: string };
};

type SpotifyPlaylistTrackItem = {
  track?: SpotifyTrack | null;
  item?: SpotifyTrack | null;
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
  details?: string;
  path?: string;

  constructor(message: string, status: number, details?: string, path?: string) {
    super(message);
    this.name = "SpotifyApiError";
    this.status = status;
    this.details = details;
    this.path = path;
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
    const details = await response.text().catch(() => "");
    throw new SpotifyApiError(
      spotifyErrorMessage(pathOrUrl, response.status, details),
      response.status,
      details,
      pathOrUrl,
    );
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

export async function fetchReadablePlaylists(
  session: SpotifyTokenSession,
  currentUserId: string,
) {
  const playlists: PlaylistSummary[] = [await fetchLikedSongsSummary(session)];
  let next: string | null | undefined = "/me/playlists?limit=50";

  while (next && playlists.length < 200) {
    const page: SpotifyPaging<SpotifyPlaylistItem> = await spotifyFetch(session, next);
    playlists.push(
      ...page.items
        .filter((playlist) => {
          return playlist.owner?.id === currentUserId || Boolean(playlist.collaborative);
        })
        .map((playlist) => ({
          id: playlist.id,
          name: playlist.name,
          owner: playlist.owner?.display_name || playlist.owner?.id || "Spotify",
          ownerId: playlist.owner?.id,
          totalTracks: playlist.tracks?.total ?? 0,
          collaborative: playlist.collaborative,
          source: "playlist" as const,
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
  let next: string | null | undefined = playlistTracksPath(playlistId, true);

  while (next && tracks.length < 300) {
    let page: SpotifyPaging<SpotifyPlaylistTrackItem>;

    try {
      page = await spotifyFetch(session, next);
    } catch (error) {
      if (
        error instanceof SpotifyApiError &&
        error.status === 400 &&
        next.includes("fields=")
      ) {
        next = playlistTracksPath(playlistId, false);
        page = await spotifyFetch(session, next);
      } else {
        throw error;
      }
    }

    tracks.push(
      ...page.items
        .map((playlistItem) => playlistItem.item ?? playlistItem.track)
        .filter((track): track is SpotifyTrack => Boolean(track && !track.is_local))
        .map(simplifyTrack),
    );
    next = page.next;
  }

  return tracks;
}

function playlistTracksPath(playlistId: string, withFields: boolean) {
  const params = new URLSearchParams({
    limit: "50",
  });

  if (withFields) {
    params.set(
      "fields",
      "items(item(id,name,duration_ms,popularity,is_local,preview_url,external_urls,artists(id,name),album(name,images))),next",
    );
  }

  return `/playlists/${encodeURIComponent(playlistId)}/items?${params}`;
}

export async function searchTracks(session: SpotifyTokenSession, query: string, limit = 12) {
  const safeLimit = Math.max(1, Math.min(limit, 10));
  const params = new URLSearchParams({
    q: query,
    type: "track",
    limit: String(safeLimit),
  });

  const data = await spotifyFetch<{ tracks: SpotifyPaging<SpotifyTrack> }>(
    session,
    `/search?${params}`,
  );

  return addPublicPreviewFallbacks(data.tracks.items.map(simplifyTrack));
}

export async function fetchSavedTracks(session: SpotifyTokenSession, limit = 300) {
  const tracks: SimplifiedTrack[] = [];
  let next: string | null | undefined = "/me/tracks?limit=50";

  while (next && tracks.length < limit) {
    const page: SpotifyPaging<SpotifyPlaylistTrackItem> = await spotifyFetch(session, next);
    tracks.push(
      ...page.items
        .map((savedTrack) => savedTrack.track)
        .filter((track): track is SpotifyTrack => Boolean(track && !track.is_local))
        .map(simplifyTrack),
    );
    next = page.next;
  }

  return tracks;
}

async function fetchLikedSongsSummary(session: SpotifyTokenSession): Promise<PlaylistSummary> {
  const page: SpotifyPaging<SpotifyPlaylistTrackItem> = await spotifyFetch(
    session,
    "/me/tracks?limit=1",
  );

  return {
    id: "liked-songs",
    name: "Liked Songs",
    owner: "You",
    totalTracks: page.total ?? 0,
    source: "liked",
  };
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
    tracks.find((track) => similarArtistName(track.artistName, candidate.artistName)) ??
    tracks[0] ??
    null
  );
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
    previewUrl: track.preview_url ?? undefined,
  };
}

function bestImage(images?: SpotifyImage[]) {
  return images?.[0]?.url;
}

function isLikelySameTrack(track: SimplifiedTrack, candidate: { name: string; artistName: string }) {
  const trackName = normalizeTrackText(track.name);
  const candidateName = normalizeTrackText(candidate.name);
  return (
    (trackName === candidateName ||
      trackName.includes(candidateName) ||
      candidateName.includes(trackName)) &&
    similarArtistName(track.artistName, candidate.artistName)
  );
}

function spotifyErrorMessage(pathOrUrl: string, status: number, details: string) {
  const spotifyMessage = parseSpotifyErrorMessage(details);
  const reason = spotifyMessage ? `: ${spotifyMessage}` : "";

  if (status === 403 && pathOrUrl.includes("/playlists/")) {
    return `Spotify denied access to that playlist's tracks${reason}. Try another playlist, or disconnect and reconnect Spotify to refresh playlist permissions.`;
  }

  if (status === 401) {
    return `Spotify session expired${reason}. Disconnect and reconnect Spotify.`;
  }

  return `Spotify API request failed (${status})${reason}`;
}

function parseSpotifyErrorMessage(details: string) {
  if (!details) {
    return "";
  }

  try {
    const parsed = JSON.parse(details) as {
      error?: { message?: string };
    };
    return parsed.error?.message ?? "";
  } catch {
    return details.slice(0, 180);
  }
}

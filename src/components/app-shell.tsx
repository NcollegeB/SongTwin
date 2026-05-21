"use client";

/* eslint-disable @next/next/no-img-element */

import {
  CheckCircle2,
  CircleAlert,
  Headphones,
  Heart,
  ListMusic,
  Loader2,
  LogOut,
  Music2,
  Play,
  PlugZap,
  Plus,
  Search,
  Sparkles,
  Waves,
  X,
} from "lucide-react";
import type { FormEvent, ReactNode } from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import type {
  ApiSessionResponse,
  PlaylistSummary,
  Recommendation,
  RecommendationResponse,
  SimplifiedTrack,
} from "@/lib/types";

type SourceMode = "playlist" | "song";
type AppShellProps = {
  accountControls?: ReactNode;
  accountSettings?: ReactNode;
  getAccountToken?: () => Promise<string | null>;
};

const initialSummary: RecommendationResponse["sourceSummary"] = {
  provider: "idle",
  lastFmConfigured: false,
  seedsAnalyzed: 0,
  spotifyMatches: 0,
  notes: [],
};

const PLAYLIST_RECOMMENDATION_SEED_LIMIT = 20;
const SONG_RECOMMENDATION_SEED_LIMIT = 20;
const RECOMMENDATION_RESULT_LIMIT = 24;

function idleSummary(lastFmConfigured = false): RecommendationResponse["sourceSummary"] {
  return { ...initialSummary, lastFmConfigured };
}

function songSeedKey(track: SimplifiedTrack) {
  return track.id ?? `${track.name.trim().toLowerCase()}::${track.artistName.trim().toLowerCase()}`;
}

function pickPlaylistSeedTracks(tracks: SimplifiedTrack[], limit: number) {
  const uniqueTracks: SimplifiedTrack[] = [];
  const seen = new Set<string>();

  for (const track of tracks) {
    const key = songSeedKey(track);
    if (!track.name || !track.artistName || seen.has(key)) {
      continue;
    }

    seen.add(key);
    uniqueTracks.push(track);
  }

  if (uniqueTracks.length <= limit) {
    return uniqueTracks;
  }

  const lastIndex = uniqueTracks.length - 1;
  return Array.from({ length: limit }, (_, index) => {
    const spreadIndex = Math.round((index * lastIndex) / (limit - 1));
    return uniqueTracks[spreadIndex];
  }).filter((track): track is SimplifiedTrack => Boolean(track));
}

export function AppShell({ accountControls, accountSettings, getAccountToken }: AppShellProps = {}) {
  const [session, setSession] = useState<ApiSessionResponse | null>(null);
  const [sessionLoading, setSessionLoading] = useState(true);
  const [playlists, setPlaylists] = useState<PlaylistSummary[]>([]);
  const [selectedPlaylistId, setSelectedPlaylistId] = useState("");
  const [tracks, setTracks] = useState<SimplifiedTrack[]>([]);
  const [sourceTracks, setSourceTracks] = useState<SimplifiedTrack[]>([]);
  const [mode, setMode] = useState<SourceMode>("playlist");
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [sourceSummary, setSourceSummary] =
    useState<RecommendationResponse["sourceSummary"]>(initialSummary);
  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState<SimplifiedTrack[]>([]);
  const [loadingTracks, setLoadingTracks] = useState(false);
  const [searching, setSearching] = useState(false);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const connected = Boolean(session?.connected);
  const selectedPlaylist = playlists.find((playlist) => playlist.id === selectedPlaylistId);
  const visibleTracks = useMemo(() => tracks.slice(0, 8), [tracks]);
  const sourceSeedTracks = useMemo(
    () =>
      mode === "playlist"
        ? pickPlaylistSeedTracks(tracks, PLAYLIST_RECOMMENDATION_SEED_LIMIT)
        : sourceTracks,
    [mode, sourceTracks, tracks],
  );
  const sourceSeedCount = sourceSeedTracks.length;
  const displayedSeedCount =
    sourceSummary.provider === "idle" ? sourceSeedCount : sourceSummary.seedsAnalyzed;
  const sourceName =
    !connected
      ? "Connect Spotify"
      : mode === "playlist"
      ? selectedPlaylist?.source === "liked"
        ? "Liked Songs"
        : selectedPlaylist?.name ?? "Playlist"
      : sourceTracks.length === 0
        ? "Add source songs"
        : sourceTracks.length === 1
          ? sourceTracks[0].name
          : `${sourceTracks.length} source songs`;
  const sourceArtist =
    !connected
      ? "Use your playlists and song searches to find listener-overlap matches"
      : mode === "playlist"
      ? selectedPlaylist?.owner ?? "Your library"
      : sourceTracks.length === 0
        ? "Search Spotify and add songs as seeds"
        : sourceTracks.length === 1
          ? sourceTracks[0].artistName
          : `Based on ${sourceTracks.slice(0, 3).map((track) => track.name).join(", ")}`;
  const sourceArtwork =
    mode === "playlist" ? selectedPlaylist?.imageUrl ?? visibleTracks[0]?.imageUrl : sourceTracks[0]?.imageUrl;
  const sourceKindLabel = !connected ? "Spotify source" : mode === "playlist" ? "Source playlist" : "Source songs";
  const sourceDetail = connected
    ? mode === "playlist"
      ? `${sourceSeedCount} seed songs will be pulled from this playlist. Results return up to ${RECOMMENDATION_RESULT_LIMIT} songs.`
      : `${sourceSeedCount} source song${sourceSeedCount === 1 ? "" : "s"} selected. Results return up to ${RECOMMENDATION_RESULT_LIMIT} songs.`
    : "";
  const graphReady =
    recommendations.length > 0 &&
    (sourceSummary.provider === "lastfm" || sourceSummary.provider === "listenbrainz");
  const needsLastFm =
    connected &&
    recommendations.length === 0 &&
    !sourceSummary.lastFmConfigured &&
    sourceSummary.provider !== "idle";

  function resetRecommendationState(lastFmConfigured = session?.lastFmConfigured ?? sourceSummary.lastFmConfigured) {
    setRecommendations([]);
    setSourceSummary(idleSummary(lastFmConfigured));
  }

  const fetchJson = useCallback(async function fetchJson<T>(url: string, init?: RequestInit) {
    const headers = new Headers(init?.headers);
    const token = await getAccountToken?.();

    if (token) {
      headers.set("Authorization", `Bearer ${token}`);
    }

    const response = await fetch(url, { ...init, headers });
    const payload = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(payload.error || `Request failed: ${response.status}`);
    }

    return payload as T;
  }, [getAccountToken]);

  useEffect(() => {
    const oauthError = new URLSearchParams(window.location.search).get("error");
    if (oauthError) {
      window.setTimeout(() => setError(oauthErrorMessage(oauthError)), 0);
      window.history.replaceState(null, "", window.location.pathname);
    }

    void loadSession();
    // The first load must run once; subsequent refreshes are triggered by user actions.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (mode !== "song" || !connected) {
      return;
    }

    const query = searchTerm.trim();
    if (query.length < 2) {
      window.setTimeout(() => setSearchResults([]), 0);
      return;
    }

    const controller = new AbortController();
    const timeout = window.setTimeout(async () => {
      setSearching(true);

      try {
        const payload = await fetchJson<{ tracks?: SimplifiedTrack[]; error?: string }>(
          `/api/search?q=${encodeURIComponent(query)}`,
          {
            signal: controller.signal,
          },
        );

        const tracks = payload.tracks ?? [];
        setError(null);
        setSearchResults(tracks);
      } catch (caught) {
        if (!controller.signal.aborted) {
          setError(caught instanceof Error ? caught.message : "Search failed.");
        }
      } finally {
        if (!controller.signal.aborted) {
          setSearching(false);
        }
      }
    }, 280);

    return () => {
      controller.abort();
      window.clearTimeout(timeout);
    };
  }, [connected, fetchJson, mode, searchTerm]);

  async function loadSession() {
    setSessionLoading(true);
    setError(null);

    try {
      const data = await fetchJson<ApiSessionResponse>("/api/session");
      setSession(data);

      if (!data.connected) {
        setPlaylists([]);
        setTracks([]);
        setSelectedPlaylistId("");
        setSourceTracks([]);
        setRecommendations([]);
        setSourceSummary(idleSummary(data.lastFmConfigured));
        return;
      }

      setRecommendations([]);
      setSourceSummary(idleSummary(data.lastFmConfigured));
      const playlistPayload = await fetchJson<{ playlists: PlaylistSummary[] }>("/api/playlists");
      setPlaylists(playlistPayload.playlists);
      await loadFirstAvailablePlaylist(playlistPayload.playlists);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to load your Spotify account.");
    } finally {
      setSessionLoading(false);
    }
  }

  async function loadFirstAvailablePlaylist(candidatePlaylists: PlaylistSummary[]) {
    for (const playlist of candidatePlaylists.slice(0, 8)) {
      const loaded = await loadPlaylistTracks(playlist.id, true, true);
      if (loaded) {
        return;
      }
    }

    setError("Spotify denied the first few playlist track lists. Try searching for a song instead.");
  }

  async function loadPlaylistTracks(playlistId: string, forceLive = false, quiet = false) {
    setSelectedPlaylistId(playlistId);
    if (!quiet) {
      resetRecommendationState();
    }

    if (!connected && !forceLive) {
      setError("Connect Spotify to load playlists.");
      return false;
    }

    setLoadingTracks(true);
    if (!quiet) {
      setError(null);
    }

    try {
      const endpoint =
        playlistId === "liked-songs"
          ? "/api/library/tracks"
          : `/api/playlists/${encodeURIComponent(playlistId)}/tracks`;
      const payload = await fetchJson<{ tracks: SimplifiedTrack[] }>(endpoint);
      setTracks(payload.tracks);
      return payload.tracks.length > 0;
    } catch (caught) {
      if (!quiet) {
        setError(caught instanceof Error ? caught.message : "Unable to load that playlist.");
      }
      return false;
    } finally {
      setLoadingTracks(false);
    }
  }

  async function searchSpotify(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!connected) {
      setError("Connect Spotify before searching.");
      return;
    }

    if (!searchTerm.trim()) {
      setSearchResults([]);
      return;
    }

    setSearching(true);
    setError(null);

    try {
      const payload = await fetchJson<{ tracks: SimplifiedTrack[] }>(
        `/api/search?q=${encodeURIComponent(searchTerm.trim())}`,
      );
      setSearchResults(payload.tracks);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Search failed.");
    } finally {
      setSearching(false);
    }
  }

  async function runRecommendations() {
    if (!connected) {
      setError("Connect Spotify to find songs from your playlists or searches.");
      return;
    }

    const seedTracks = sourceSeedTracks;
    if (seedTracks.length === 0) {
      setError(mode === "song" ? "Add at least one source song first." : "Choose a playlist first.");
      return;
    }

    setRunning(true);
    setError(null);

    try {
      const payload = await fetchJson<RecommendationResponse>("/api/recommend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ seedTracks, limit: RECOMMENDATION_RESULT_LIMIT }),
      });
      setRecommendations(payload.recommendations);
      setSourceSummary(payload.sourceSummary);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Recommendation run failed.");
    } finally {
      setRunning(false);
    }
  }

  function addSourceTrack(track: SimplifiedTrack) {
    const key = songSeedKey(track);

    if (sourceTracks.some((sourceTrack) => songSeedKey(sourceTrack) === key)) {
      return;
    }

    if (sourceTracks.length >= SONG_RECOMMENDATION_SEED_LIMIT) {
      setError(`You can add up to ${SONG_RECOMMENDATION_SEED_LIMIT} source songs for one run.`);
      return;
    }

    setError(null);
    setSourceTracks([...sourceTracks, track]);
    resetRecommendationState();
  }

  function removeSourceTrack(track: SimplifiedTrack) {
    const key = songSeedKey(track);
    const nextTracks = sourceTracks.filter((sourceTrack) => songSeedKey(sourceTrack) !== key);
    setSourceTracks(nextTracks);
    resetRecommendationState();
  }

  function clearSourceTracks() {
    setSourceTracks([]);
    resetRecommendationState();
  }

  async function logout() {
    setError(null);

    try {
      await fetch("/api/auth/logout", { method: "POST" });
      await loadSession();
    } catch {
      setError("Disconnect failed because the local dev server could not be reached. Refresh the page and try again.");
    }
  }

  return (
    <main className="min-h-screen bg-black p-2 text-white sm:p-3">
      <div className="mx-auto flex min-h-[calc(100vh-1rem)] w-full max-w-[1500px] flex-col gap-2">
        {accountSettings}
        <div className="grid min-h-0 flex-1 gap-2 lg:grid-cols-[310px_minmax(0,1fr)]">
          <aside className="flex min-h-0 flex-col gap-2">
          <section className="rounded-lg bg-[#121212] p-4">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded bg-[#1db954] text-black">
                  <Waves size={22} aria-hidden="true" />
                </div>
                <div>
                  <h1 className="text-xl font-bold tracking-normal">SongTwin</h1>
                  <p className="text-xs text-[#b3b3b3]">Listener graph discovery</p>
                </div>
              </div>
              <StatusPill connected={connected} loading={sessionLoading} />
            </div>

            <div className="mt-5 grid grid-cols-2 gap-2 rounded-lg bg-[#0a0a0a] p-1">
              <button
                className={modeButtonClass(mode === "playlist")}
                onClick={() => {
                  setMode("playlist");
                  resetRecommendationState();
                }}
                type="button"
              >
                <ListMusic size={16} aria-hidden="true" />
                Playlist
              </button>
              <button
                className={modeButtonClass(mode === "song")}
                onClick={() => {
                  setMode("song");
                  resetRecommendationState();
                }}
                type="button"
              >
                <Music2 size={16} aria-hidden="true" />
                Song
              </button>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              {connected ? (
                <button className="connect-button secondary" onClick={logout} type="button">
                  <LogOut size={16} aria-hidden="true" />
                  Disconnect
                </button>
              ) : (
                <a
                  className={[
                    "connect-button",
                    session?.spotifyConfigured === false ? "pointer-events-none opacity-50" : "",
                  ].join(" ")}
                  href="/api/auth/login?returnTo=/app"
                >
                  <PlugZap size={16} aria-hidden="true" />
                  Connect Spotify
                </a>
              )}
            </div>
            {accountControls ? <div className="mt-4">{accountControls}</div> : null}
          </section>

          <section className="min-h-0 flex-1 rounded-lg bg-[#121212] p-4">
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm font-semibold text-[#b3b3b3]">
                <Headphones size={17} aria-hidden="true" />
                Your Library
              </div>
              <span className="text-xs text-[#737373]">{connected ? "Spotify" : "Connect"}</span>
            </div>

            {!connected ? (
              <ConnectLibraryPrompt />
            ) : mode === "playlist" ? (
              <div className="flex min-h-0 flex-col gap-3">
                <label className="sr-only" htmlFor="playlist">
                  Playlist
                </label>
                <select
                  className="h-11 w-full rounded-lg border border-[#2a2a2a] bg-[#242424] px-3 text-sm font-medium text-white outline-none transition hover:bg-[#2a2a2a] focus:border-[#1db954]"
                  id="playlist"
                  value={selectedPlaylistId}
                  onChange={(event) => void loadPlaylistTracks(event.target.value)}
                >
                  {playlists.map((playlist) => (
                    <option key={playlist.id} value={playlist.id}>
                      {playlist.source === "liked" ? "Liked Songs" : playlist.name}
                    </option>
                  ))}
                </select>

                <PlaylistPreview
                  loading={loadingTracks}
                  playlist={selectedPlaylist}
                  seedCount={sourceSeedCount}
                  seedLimit={PLAYLIST_RECOMMENDATION_SEED_LIMIT}
                  tracks={visibleTracks}
                />
              </div>
            ) : (
              <div>
                <form className="relative" onSubmit={searchSpotify}>
                  <label className="sr-only" htmlFor="song-search">
                    Search for a song
                  </label>
                  <Search
                    className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#a7a7a7]"
                    size={17}
                    aria-hidden="true"
                  />
                  <input
                    className="h-11 w-full rounded-full border border-transparent bg-[#242424] pl-10 pr-12 text-sm font-medium text-white outline-none transition placeholder:text-[#a7a7a7] hover:bg-[#2a2a2a] focus:border-[#1db954]"
                    id="song-search"
                    onChange={(event) => setSearchTerm(event.target.value)}
                    placeholder="What song?"
                    value={searchTerm}
                  />
                  <button
                    className="absolute right-1 top-1/2 inline-flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-[#1db954] text-black transition hover:scale-105 disabled:cursor-not-allowed disabled:opacity-60"
                    disabled={searching}
                    type="submit"
                  >
                    {searching ? (
                      <Loader2 className="animate-spin" size={16} aria-hidden="true" />
                    ) : (
                      <Play size={15} aria-hidden="true" />
                    )}
                    <span className="sr-only">Search Spotify</span>
                  </button>
                </form>

                <SourceSongsPanel
                  maxSeeds={SONG_RECOMMENDATION_SEED_LIMIT}
                  tracks={sourceTracks}
                  onClear={clearSourceTracks}
                  onRemove={removeSourceTrack}
                />

                <SearchResults
                  connected={connected}
                  query={searchTerm}
                  searching={searching}
                  sourceTracks={sourceTracks}
                  tracks={connected ? searchResults : []}
                  onAdd={addSourceTrack}
                />
              </div>
            )}
          </section>
          </aside>

          <section className="min-w-0 overflow-hidden rounded-lg bg-[#121212]">
          <div className="bg-[linear-gradient(180deg,#1f4f35_0%,#163525_34%,#121212_100%)] px-4 pb-6 pt-4 sm:px-6 lg:px-8">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex min-w-0 items-center gap-3">
                {session?.profile?.imageUrl ? (
                  <img
                    alt=""
                    className="h-9 w-9 rounded-full object-cover"
                    src={session.profile.imageUrl}
                  />
                ) : (
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-black/30 text-[#1db954]">
                    <Sparkles size={18} aria-hidden="true" />
                  </div>
                )}
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">
                    {session?.profile?.displayName ?? "Taste Explorer"}
                  </p>
                  <p className="truncate text-xs text-[#d8e8de]">
                    {connected ? "Connected with Spotify" : "Connect Spotify to start"}
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <SourceBadge summary={sourceSummary} />
                <GraphHealth
                  connected={connected}
                  graphReady={graphReady}
                  needsLastFm={needsLastFm}
                />
              </div>
            </div>

            {error ? (
              <Alert tone="error" icon={<CircleAlert size={18} aria-hidden="true" />}>
                {error}
              </Alert>
            ) : null}

            {session?.setupSteps.length ? (
              <Alert tone="warn" icon={<CircleAlert size={18} aria-hidden="true" />}>
                {session.setupSteps.join(" ")}
              </Alert>
            ) : null}

            <div className="mt-7 flex flex-col gap-5 md:flex-row md:items-end">
              <Cover src={sourceArtwork} label={sourceName} size="hero" />
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#d8e8de]">
                  {sourceKindLabel}
                </p>
                <h2 className="mt-2 break-words text-4xl font-black tracking-normal sm:text-5xl lg:text-6xl">
                  {sourceName}
                </h2>
                <p className="mt-3 truncate text-sm font-medium text-[#d8e8de]">{sourceArtist}</p>
                {sourceDetail ? (
                  <p className="mt-2 text-sm font-semibold text-[#b7f7cb]">{sourceDetail}</p>
                ) : null}
                <div className="mt-5 flex flex-wrap items-center gap-3">
                  <button
                    className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-[#1db954] px-6 text-sm font-bold text-black shadow-lg shadow-black/25 transition hover:scale-[1.02] hover:bg-[#1ed760] disabled:cursor-not-allowed disabled:opacity-60"
                    disabled={!connected || running || sessionLoading || sourceSeedCount === 0}
                    onClick={runRecommendations}
                    type="button"
                  >
                    {running ? <Loader2 className="animate-spin" size={18} /> : <Play size={18} />}
                    Find songs
                  </button>
                  {mode === "song" && sourceTracks.length === 1 ? (
                    <OpenTrackActions
                      key={`${sourceTracks[0].id ?? sourceTracks[0].spotifyUrl ?? sourceTracks[0].name}-${sourceTracks[0].artistName}`}
                      labeled
                      track={sourceTracks[0]}
                    />
                  ) : null}
                  <div className="grid grid-cols-3 gap-2">
                    <MiniStat icon={<Headphones size={15} />} label="Seeds" value={displayedSeedCount} />
                    <MiniStat icon={<Heart size={15} />} label="Songs" value={recommendations.length} />
                    <MiniStat icon={<CheckCircle2 size={15} />} label="Linked" value={sourceSummary.spotifyMatches} />
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="px-4 pb-8 sm:px-6 lg:px-8">
            <SourceNotes notes={sourceSummary.notes} />

            <div className="mt-4 flex items-end justify-between gap-4">
              <div>
                <h3 className="text-2xl font-bold tracking-normal">Songs to try next</h3>
                <p className="mt-1 text-sm text-[#a7a7a7]">
                  {recommendations.length > 0
                    ? "Ranked from listener-overlap sources and mapped back to Spotify."
                    : emptyRecommendationMessage(sourceSummary, connected, mode)}
                </p>
              </div>
            </div>

            <div className="mt-4">
              {running ? (
                <LoadingPanel />
              ) : recommendations.length > 0 ? (
                <div className="overflow-hidden rounded-lg border border-[#242424]">
                  <div className="grid grid-cols-[44px_minmax(0,1.6fr)_minmax(0,1fr)_132px] gap-3 border-b border-[#242424] bg-black/20 px-3 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-[#a7a7a7] max-md:hidden">
                    <span>#</span>
                    <span>Title</span>
                    <span>Signal</span>
                    <span className="text-right">Fit</span>
                  </div>
                  <div className="divide-y divide-[#242424]">
                    {recommendations.map((track) => (
                      <RecommendationRow key={`${track.rank}-${track.name}`} track={track} />
                    ))}
                  </div>
                </div>
              ) : (
                <EmptyPanel connected={connected} mode={mode} summary={sourceSummary} />
              )}
            </div>
          </div>
          </section>
        </div>
      </div>
    </main>
  );
}

function StatusPill({ connected, loading }: { connected: boolean; loading: boolean }) {
  return (
    <div className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-[#242424]">
      {loading ? (
        <Loader2 className="animate-spin text-[#a7a7a7]" size={16} aria-hidden="true" />
      ) : connected ? (
        <CheckCircle2 className="text-[#1db954]" size={16} aria-hidden="true" />
      ) : (
        <CircleAlert className="text-[#f5b84b]" size={16} aria-hidden="true" />
      )}
      <span className="sr-only">{loading ? "Checking" : connected ? "Spotify linked" : "Spotify not linked"}</span>
    </div>
  );
}

function MiniStat({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: number;
}) {
  return (
    <div className="min-w-[70px] rounded-lg bg-black/30 px-3 py-2">
      <div className="flex items-center gap-2 text-[#1db954]">
        {icon}
        <span className="text-sm font-bold text-white">{value}</span>
      </div>
      <p className="mt-1 text-[11px] font-medium text-[#b3b3b3]">{label}</p>
    </div>
  );
}

function PlaylistPreview({
  loading,
  playlist,
  seedCount,
  seedLimit,
  tracks,
}: {
  loading: boolean;
  playlist?: PlaylistSummary;
  seedCount: number;
  seedLimit: number;
  tracks: SimplifiedTrack[];
}) {
  return (
    <div className="min-h-0">
      <div className="flex items-center gap-3 rounded-lg bg-[#181818] p-3">
        <Cover src={playlist?.imageUrl ?? tracks[0]?.imageUrl} label={playlist?.name ?? "Playlist"} size="md" />
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold">{playlist?.name ?? "Playlist"}</p>
          <p className="text-xs text-[#a7a7a7]">
            {loading ? "Loading" : `${playlist?.totalTracks ?? tracks.length} songs`}
          </p>
        </div>
      </div>
      <p className="mt-2 rounded-lg bg-[#0f2418] px-3 py-2 text-xs font-semibold text-[#b7f7cb]">
        Pulls {seedCount} seed song{seedCount === 1 ? "" : "s"} for this run, up to {seedLimit} max.
      </p>

      <div className="mt-3 max-h-[52vh] overflow-auto pr-1">
        {loading ? (
          <div className="flex items-center gap-2 rounded-lg bg-[#181818] p-3 text-sm text-[#a7a7a7]">
            <Loader2 className="animate-spin" size={16} />
            Loading songs
          </div>
        ) : tracks.length > 0 ? (
          tracks.map((track, index) => (
            <div
              className="grid grid-cols-[24px_38px_minmax(0,1fr)] items-center gap-2 rounded-lg px-2 py-2 text-sm transition hover:bg-[#242424]"
              key={`${track.id}-${track.name}`}
            >
              <span className="text-right text-xs text-[#737373]">{index + 1}</span>
              <Cover src={track.imageUrl} label={track.name} size="xs" />
              <div className="min-w-0">
                <p className="truncate font-medium text-[#f1f1f1]">{track.name}</p>
                <p className="truncate text-xs text-[#a7a7a7]">{track.artistName}</p>
              </div>
            </div>
          ))
        ) : (
          <p className="rounded-lg bg-[#181818] p-3 text-sm text-[#a7a7a7]">No readable songs found.</p>
        )}
      </div>
    </div>
  );
}

function ConnectLibraryPrompt() {
  return (
    <div className="rounded-lg bg-[#181818] p-4">
      <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[#242424] text-[#1db954]">
        <PlugZap size={20} aria-hidden="true" />
      </div>
      <h2 className="mt-4 text-base font-bold">Connect your Spotify library</h2>
      <p className="mt-2 text-sm leading-6 text-[#a7a7a7]">
        SongTwin uses your playlists, liked songs, and search selections as seeds for listener-overlap matching.
      </p>
    </div>
  );
}

function SearchResults({
  connected,
  query,
  searching,
  sourceTracks,
  tracks,
  onAdd,
}: {
  connected: boolean;
  query: string;
  searching: boolean;
  sourceTracks: SimplifiedTrack[];
  tracks: SimplifiedTrack[];
  onAdd: (track: SimplifiedTrack) => void;
}) {
  const trimmedQuery = query.trim();
  const sourceTrackKeys = new Set(sourceTracks.map(songSeedKey));

  return (
    <div className="mt-3 grid gap-2">
      {connected && trimmedQuery.length > 0 && trimmedQuery.length < 2 ? (
        <p className="rounded-lg bg-[#181818] p-3 text-sm text-[#a7a7a7]">Keep typing.</p>
      ) : null}
      {connected && trimmedQuery.length >= 2 && searching ? (
        <div className="flex items-center gap-2 rounded-lg bg-[#181818] p-3 text-sm text-[#a7a7a7]">
          <Loader2 className="animate-spin" size={16} />
          Searching Spotify
        </div>
      ) : null}
      {connected && trimmedQuery.length >= 2 && !searching && tracks.length === 0 ? (
        <p className="rounded-lg bg-[#181818] p-3 text-sm text-[#a7a7a7]">No songs found.</p>
      ) : null}

      {tracks.slice(0, 7).map((track) => (
        <SearchResultRow
          added={sourceTrackKeys.has(songSeedKey(track))}
          key={`${track.id}-${track.name}`}
          track={track}
          onAdd={onAdd}
        />
      ))}
    </div>
  );
}

function SourceSongsPanel({
  maxSeeds,
  tracks,
  onClear,
  onRemove,
}: {
  maxSeeds: number;
  tracks: SimplifiedTrack[];
  onClear: () => void;
  onRemove: (track: SimplifiedTrack) => void;
}) {
  return (
    <section className="mt-3 rounded-lg border border-[#242424] bg-[#181818] p-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-bold">Source Songs</h2>
          <p className="mt-0.5 text-xs text-[#a7a7a7]">
            {tracks.length} / {maxSeeds} seeds selected
          </p>
        </div>
        {tracks.length > 0 ? (
          <button
            className="rounded-full bg-[#242424] px-3 py-1.5 text-xs font-bold text-[#d8d8d8] transition hover:bg-[#333]"
            onClick={onClear}
            type="button"
          >
            Clear
          </button>
        ) : null}
      </div>

      <div className="mt-3 grid gap-2">
        {tracks.length === 0 ? (
          <p className="rounded-lg bg-[#121212] p-3 text-sm text-[#a7a7a7]">
            Add songs from the search results. Find songs uses this source list.
          </p>
        ) : (
          tracks.map((track) => (
            <article
              className="grid grid-cols-[38px_minmax(0,1fr)_auto] items-center gap-2 rounded-lg bg-[#121212] p-2 text-sm"
              key={songSeedKey(track)}
            >
              <Cover src={track.imageUrl} label={track.name} size="xs" />
              <div className="min-w-0">
                <p className="truncate font-semibold text-white">{track.name}</p>
                <p className="truncate text-xs text-[#a7a7a7]">{track.artistName}</p>
              </div>
              <button
                className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-[#242424] text-[#d8d8d8] transition hover:bg-[#333] hover:text-white"
                onClick={() => onRemove(track)}
                type="button"
              >
                <X size={15} aria-hidden="true" />
                <span className="sr-only">Remove source song</span>
              </button>
            </article>
          ))
        )}
      </div>
    </section>
  );
}

function SearchResultRow({
  added,
  track,
  onAdd,
}: {
  added: boolean;
  track: SimplifiedTrack;
  onAdd: (track: SimplifiedTrack) => void;
}) {
  return (
    <article
      className={[
        "grid grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-2 rounded-lg p-2 text-sm transition",
        added ? "bg-[#1db954] text-black" : "bg-[#181818] text-white hover:bg-[#242424]",
      ].join(" ")}
    >
      <button
        className="grid min-w-0 grid-cols-[42px_minmax(0,1fr)] items-center gap-3 text-left"
        onClick={() => onAdd(track)}
        type="button"
      >
        <Cover src={track.imageUrl} label={track.name} size="sm" />
        <span className="min-w-0">
          <span className="block truncate font-semibold">{track.name}</span>
          <span className={["block truncate text-xs", added ? "text-black/75" : "text-[#a7a7a7]"].join(" ")}>
            {track.artistName}
          </span>
        </span>
      </button>
      <button
        className={[
          "inline-flex h-8 items-center justify-center gap-1.5 rounded-full px-3 text-xs font-black transition",
          added
            ? "bg-black/15 text-black hover:bg-black/25"
            : "bg-[#1db954] text-black hover:bg-[#1ed760]",
        ].join(" ")}
        onClick={() => onAdd(track)}
        type="button"
      >
        {added ? <CheckCircle2 size={14} aria-hidden="true" /> : <Plus size={14} aria-hidden="true" />}
        {added ? "Added" : "Add"}
      </button>
      <OpenTrackActions selected={added} track={track} />
    </article>
  );
}

function RecommendationRow({ track }: { track: Recommendation }) {
  return (
    <article className="grid gap-3 bg-[#121212] px-3 py-3 transition hover:bg-[#1f1f1f] md:grid-cols-[44px_minmax(0,1.6fr)_minmax(0,1fr)_132px] md:items-center">
      <div className="hidden text-sm text-[#a7a7a7] md:block">{track.rank}</div>

      <div className="flex min-w-0 items-center gap-3">
        <Cover src={track.imageUrl} label={track.name} size="sm" />
        <div className="min-w-0">
          <p className="truncate font-semibold text-white">{track.name}</p>
          <p className="truncate text-sm text-[#a7a7a7]">{track.artistName}</p>
        </div>
      </div>

      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <span className={signalClass(track.signal)}>{signalLabel(track.signal)}</span>
          <span className="text-xs text-[#a7a7a7]">
            {track.support} source match{track.support === 1 ? "" : "es"}
          </span>
        </div>
        <p className="mt-1 truncate text-xs text-[#737373]">Near {track.seedNames.slice(0, 3).join(", ")}</p>
      </div>

      <div className="flex items-center justify-between gap-3 md:justify-end">
        <div className="h-1.5 w-24 overflow-hidden rounded-full bg-[#333]">
          <div
            className="h-full rounded-full bg-[#1db954]"
            style={{ width: `${Math.max(4, Math.min(track.score, 100))}%` }}
          />
        </div>
        <span className="w-8 text-right text-sm font-bold text-white">{track.score}</span>
        <OpenTrackActions track={track} />
      </div>
    </article>
  );
}

function OpenTrackActions({
  labeled = false,
  selected = false,
  track,
}: {
  labeled?: boolean;
  selected?: boolean;
  track: SimplifiedTrack;
}) {
  const spotifyUrl = spotifyTrackUrl(track);
  const spotifyClass = labeled
    ? "inline-flex h-10 items-center justify-center gap-2 rounded-full bg-[#1ed760] px-4 text-xs font-black text-black transition hover:scale-[1.02] hover:bg-[#3be477]"
    : [
        "inline-flex h-8 w-8 items-center justify-center rounded-full transition",
        selected ? "bg-black/15 text-black hover:bg-black/25" : "bg-[#242424] text-[#1ed760] hover:bg-[#333]",
      ].join(" ");
  const youtubeClass = labeled
    ? "inline-flex h-10 items-center justify-center gap-2 rounded-full bg-[#242424] px-4 text-xs font-black text-white transition hover:scale-[1.02] hover:bg-[#333]"
    : [
        "inline-flex h-8 w-8 items-center justify-center rounded-full transition",
        selected ? "bg-black/15 text-black hover:bg-black/25" : "bg-[#242424] text-white hover:bg-[#333]",
      ].join(" ");

  return (
    <div className="flex shrink-0 items-center gap-1.5">
      {spotifyUrl ? (
        <a className={spotifyClass} href={spotifyUrl} rel="noreferrer" target="_blank">
          <SpotifyIcon size={15} />
          <span className={labeled ? "" : "sr-only"}>Open in Spotify</span>
        </a>
      ) : null}
      <a className={youtubeClass} href={youtubeSearchUrl(track)} rel="noreferrer" target="_blank">
        <YouTubeIcon size={15} />
        <span className={labeled ? "" : "sr-only"}>Open in YouTube</span>
      </a>
    </div>
  );
}

function spotifyTrackUrl(track: SimplifiedTrack) {
  return track.id ? `https://open.spotify.com/track/${track.id}` : track.spotifyUrl;
}

function youtubeSearchUrl(track: SimplifiedTrack) {
  return `https://www.youtube.com/results?search_query=${encodeURIComponent(`${track.name} ${track.artistName}`)}`;
}

function SpotifyIcon({ size }: { size: number }) {
  return (
    <svg aria-hidden="true" height={size} viewBox="0 0 24 24" width={size}>
      <path
        d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Zm4.59 14.42a.77.77 0 0 1-1.06.26c-2.9-1.77-6.55-2.17-10.85-1.19a.77.77 0 0 1-.34-1.5c4.71-1.08 8.75-.61 12 1.38.36.22.48.69.25 1.05Zm1.22-2.72a.96.96 0 0 1-1.32.31c-3.32-2.04-8.39-2.63-12.31-1.44a.96.96 0 1 1-.56-1.84c4.49-1.36 10.08-.7 13.87 1.63.45.28.59.88.32 1.34Zm.1-2.83C13.93 8.51 7.36 8.29 3.56 9.44a1.15 1.15 0 1 1-.67-2.2c4.37-1.33 11.63-1.07 16.19 1.63a1.15 1.15 0 0 1-1.17 1.98Z"
        fill="currentColor"
      />
    </svg>
  );
}

function YouTubeIcon({ size }: { size: number }) {
  return (
    <svg aria-hidden="true" height={size} viewBox="0 0 24 24" width={size}>
      <path
        d="M21.5 7.1a3 3 0 0 0-2.1-2.13C17.55 4.5 12 4.5 12 4.5s-5.55 0-7.4.47A3 3 0 0 0 2.5 7.1 31.4 31.4 0 0 0 2 12a31.4 31.4 0 0 0 .5 4.9 3 3 0 0 0 2.1 2.13c1.85.47 7.4.47 7.4.47s5.55 0 7.4-.47a3 3 0 0 0 2.1-2.13A31.4 31.4 0 0 0 22 12a31.4 31.4 0 0 0-.5-4.9ZM10 15.2V8.8l5.5 3.2L10 15.2Z"
        fill="currentColor"
      />
    </svg>
  );
}

function LoadingPanel() {
  return (
    <div className="flex min-h-48 items-center justify-center rounded-lg border border-[#242424] bg-[#181818] text-sm text-[#a7a7a7]">
      <div className="flex items-center gap-2">
        <Loader2 className="animate-spin" size={18} />
        Building listener graph
      </div>
    </div>
  );
}

function EmptyPanel({
  connected,
  mode,
  summary,
}: {
  connected: boolean;
  mode: SourceMode;
  summary: RecommendationResponse["sourceSummary"];
}) {
  const hasRun = summary.provider !== "idle";

  return (
    <div className="rounded-lg border border-[#242424] bg-[#181818] p-6">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#242424] text-[#1db954]">
        <Headphones size={22} aria-hidden="true" />
      </div>
      <h4 className="mt-4 text-lg font-bold">
        {connected && !hasRun ? "Ready to find songs" : "No listener-overlap songs yet"}
      </h4>
      <p className="mt-2 max-w-2xl text-sm leading-6 text-[#b3b3b3]">
        {emptyRecommendationMessage(summary, connected, mode)}
      </p>
      {connected && hasRun && !summary.lastFmConfigured ? (
        <p className="mt-3 max-w-2xl text-sm leading-6 text-[#b3b3b3]">
          A Last.fm API key gives SongTwin a wider track similarity graph than the no-key ListenBrainz fallback.
        </p>
      ) : null}
    </div>
  );
}

function SourceNotes({ notes }: { notes: string[] }) {
  if (notes.length === 0) {
    return null;
  }

  return (
    <div className="mt-4 flex flex-wrap gap-2">
      {notes.slice(0, 3).map((note) => (
        <span className="rounded-full bg-[#242424] px-3 py-1.5 text-xs font-medium text-[#d8d8d8]" key={note}>
          {note}
        </span>
      ))}
    </div>
  );
}

function Alert({
  children,
  icon,
  tone,
}: {
  children: ReactNode;
  icon: ReactNode;
  tone: "error" | "warn";
}) {
  const className =
    tone === "error"
      ? "border-[#5b2a2a] bg-[#2a1212] text-[#ffd8d8]"
      : "border-[#5f4a1a] bg-[#2a2111] text-[#ffe1a3]";

  return (
    <div className={`mt-4 flex items-start gap-3 rounded-lg border p-3 text-sm ${className}`}>
      <span className="mt-0.5 shrink-0">{icon}</span>
      <span>{children}</span>
    </div>
  );
}

function Cover({
  src,
  label,
  size,
}: {
  src?: string;
  label: string;
  size: "xs" | "sm" | "md" | "hero";
}) {
  const sizeClass =
    size === "xs"
      ? "h-8 w-8 rounded"
      : size === "sm"
        ? "h-11 w-11 rounded"
        : size === "md"
          ? "h-14 w-14 rounded"
          : "h-40 w-40 rounded-lg sm:h-48 sm:w-48";
  const iconSize = size === "xs" ? 14 : size === "hero" ? 44 : 20;

  return (
    <div
      className={`${sizeClass} flex shrink-0 items-center justify-center overflow-hidden bg-[#282828] text-[#1db954] shadow-lg shadow-black/20`}
    >
      {src ? (
        <img alt={`${label} artwork`} className="h-full w-full object-cover" src={src} />
      ) : (
        <Music2 size={iconSize} aria-hidden="true" />
      )}
    </div>
  );
}

function SourceBadge({ summary }: { summary: RecommendationResponse["sourceSummary"] }) {
  const label =
    summary.provider === "lastfm"
        ? "Last.fm graph"
        : summary.provider === "listenbrainz"
          ? "ListenBrainz graph"
          : "Listener graph";

  return (
    <span className="inline-flex h-8 items-center rounded-full bg-black/30 px-3 text-xs font-bold text-white">
      {label}
    </span>
  );
}

function GraphHealth({
  connected,
  graphReady,
  needsLastFm,
}: {
  connected: boolean;
  graphReady: boolean;
  needsLastFm: boolean;
}) {
  const label = !connected
    ? "Sign in"
    : graphReady
      ? "Co-listening"
      : needsLastFm
        ? "Add Last.fm key"
        : "Ready";
  const className = graphReady
    ? "bg-[#1db954] text-black"
    : needsLastFm
      ? "bg-[#f5b84b] text-black"
      : "bg-[#242424] text-[#d8d8d8]";

  return (
    <span className={`inline-flex h-8 items-center rounded-full px-3 text-xs font-bold ${className}`}>
      {label}
    </span>
  );
}

function modeButtonClass(active: boolean) {
  return [
    "inline-flex h-10 items-center justify-center gap-2 rounded-lg text-sm font-bold transition",
    active ? "bg-[#1db954] text-black" : "text-[#b3b3b3] hover:bg-[#242424] hover:text-white",
  ].join(" ");
}

function signalLabel(signal: Recommendation["signal"]) {
  switch (signal) {
    case "lastfm-co-listening":
      return "Last.fm listeners";
    case "listenbrainz-collaborative":
      return "ListenBrainz listeners";
  }
}

function signalClass(signal: Recommendation["signal"]) {
  const base = "inline-flex rounded-full px-2.5 py-1 text-[11px] font-bold";
  switch (signal) {
    case "lastfm-co-listening":
    case "listenbrainz-collaborative":
      return `${base} bg-[#1db954] text-black`;
  }
}

function emptyRecommendationMessage(
  summary: RecommendationResponse["sourceSummary"],
  connected: boolean,
  mode: SourceMode,
) {
  if (!connected) {
    return "Connect Spotify to choose a playlist or song and build recommendations from listener-overlap data.";
  }

  if (summary.provider === "idle") {
    return mode === "song"
      ? "Search for songs, add them to Source Songs, then run Find songs to build recommendations."
      : "Choose a playlist, then run Find songs to build recommendations from listener-overlap data.";
  }

  if (!summary.lastFmConfigured) {
    return "ListenBrainz did not return cross-artist listener matches for this source. SongTwin is hiding same-artist Spotify catalog filler; add LASTFM_API_KEY for the stronger co-listening graph.";
  }

  return "No cross-artist listener matches came back for this source. Try a broader playlist or a different source song.";
}

function oauthErrorMessage(error: string) {
  if (error === "invalid-auth-state") {
    return "Spotify login state expired or came back on a different host. Start Spotify connection again from this same URL.";
  }

  if (error === "spotify-token-exchange") {
    return "Spotify approved the login, but the token exchange failed. Check that the Spotify app contains this site's exact callback URL.";
  }

  if (error === "missing-spotify-client-id") {
    return "SPOTIFY_CLIENT_ID is missing from .env.local.";
  }

  return `Spotify login failed: ${error}`;
}

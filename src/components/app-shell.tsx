"use client";

/* eslint-disable @next/next/no-img-element */

import {
  CheckCircle2,
  CircleAlert,
  ExternalLink,
  Headphones,
  Heart,
  ListMusic,
  Loader2,
  LogOut,
  Music2,
  Play,
  PlugZap,
  Search,
  Sparkles,
  Waves,
} from "lucide-react";
import type { FormEvent, ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import { demoPlaylists, demoRecommendations, demoTracks } from "@/lib/demo-data";
import type {
  ApiSessionResponse,
  PlaylistSummary,
  Recommendation,
  RecommendationResponse,
  SimplifiedTrack,
} from "@/lib/types";

type SourceMode = "playlist" | "song";

const demoSummary: RecommendationResponse["sourceSummary"] = {
  provider: "demo",
  lastFmConfigured: false,
  seedsAnalyzed: demoTracks.length,
  spotifyMatches: demoRecommendations.length,
  notes: ["Demo matches are showing until Spotify is connected."],
};

export function AppShell() {
  const [session, setSession] = useState<ApiSessionResponse | null>(null);
  const [sessionLoading, setSessionLoading] = useState(true);
  const [playlists, setPlaylists] = useState<PlaylistSummary[]>(demoPlaylists);
  const [selectedPlaylistId, setSelectedPlaylistId] = useState(demoPlaylists[0]?.id ?? "");
  const [tracks, setTracks] = useState<SimplifiedTrack[]>(demoTracks);
  const [selectedTrack, setSelectedTrack] = useState<SimplifiedTrack | null>(demoTracks[0]);
  const [mode, setMode] = useState<SourceMode>("playlist");
  const [recommendations, setRecommendations] = useState<Recommendation[]>(demoRecommendations);
  const [sourceSummary, setSourceSummary] =
    useState<RecommendationResponse["sourceSummary"]>(demoSummary);
  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState<SimplifiedTrack[]>([]);
  const [loadingTracks, setLoadingTracks] = useState(false);
  const [searching, setSearching] = useState(false);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const connected = Boolean(session?.connected);
  const selectedPlaylist = playlists.find((playlist) => playlist.id === selectedPlaylistId);
  const visibleTracks = useMemo(() => tracks.slice(0, 6), [tracks]);

  useEffect(() => {
    void loadSession();
    // The first load must run once; subsequent refreshes are triggered by user actions.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function fetchJson<T>(url: string, init?: RequestInit) {
    const response = await fetch(url, init);
    const payload = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(payload.error || `Request failed: ${response.status}`);
    }

    return payload as T;
  }

  async function loadSession() {
    setSessionLoading(true);
    setError(null);

    try {
      const data = await fetchJson<ApiSessionResponse>("/api/session");
      setSession(data);

      if (!data.connected) {
        setPlaylists(demoPlaylists);
        setTracks(demoTracks);
        setSelectedPlaylistId(demoPlaylists[0]?.id ?? "");
        setSelectedTrack(demoTracks[0]);
        setRecommendations(demoRecommendations);
        setSourceSummary(demoSummary);
        return;
      }

      const playlistPayload = await fetchJson<{ playlists: PlaylistSummary[] }>("/api/playlists");
      setPlaylists(playlistPayload.playlists);
      const firstPlaylist = playlistPayload.playlists[0];
      if (firstPlaylist) {
        await loadPlaylistTracks(firstPlaylist.id, true);
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to load your Spotify account.");
    } finally {
      setSessionLoading(false);
    }
  }

  async function loadPlaylistTracks(playlistId: string, forceLive = false) {
    setSelectedPlaylistId(playlistId);

    if (!connected && !forceLive) {
      setTracks(demoTracks);
      setSelectedTrack(demoTracks[0]);
      return;
    }

    setLoadingTracks(true);
    setError(null);

    try {
      const payload = await fetchJson<{ tracks: SimplifiedTrack[] }>(
        `/api/playlists/${encodeURIComponent(playlistId)}/tracks`,
      );
      setTracks(payload.tracks);
      setSelectedTrack(payload.tracks[0] ?? null);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to load that playlist.");
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
      if (payload.tracks[0]) {
        setSelectedTrack(payload.tracks[0]);
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Search failed.");
    } finally {
      setSearching(false);
    }
  }

  async function runRecommendations() {
    if (!connected) {
      setRecommendations(demoRecommendations);
      setSourceSummary(demoSummary);
      return;
    }

    const seedTracks = mode === "playlist" ? tracks.slice(0, 25) : selectedTrack ? [selectedTrack] : [];
    if (seedTracks.length === 0) {
      setError("Choose a playlist or song first.");
      return;
    }

    setRunning(true);
    setError(null);

    try {
      const payload = await fetchJson<RecommendationResponse>("/api/recommend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ seedTracks, limit: 24 }),
      });
      setRecommendations(payload.recommendations);
      setSourceSummary(payload.sourceSummary);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Recommendation run failed.");
    } finally {
      setRunning(false);
    }
  }

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    await loadSession();
  }

  return (
    <main className="min-h-screen px-4 py-4 text-[#17201b] sm:px-6 lg:px-8">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-5">
        <header className="flex flex-col gap-4 rounded-lg border border-[#dfe6d8] bg-white/88 p-4 shadow-sm backdrop-blur sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-[#1db954] text-[#0b2314]">
              <Waves size={24} aria-hidden="true" />
            </div>
            <div>
              <h1 className="text-2xl font-semibold">SongTwin</h1>
              <p className="text-sm text-[#647064]">Find the songs your taste is already near.</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <StatusPill connected={connected} loading={sessionLoading} />
            {connected ? (
              <button
                className="inline-flex h-10 items-center gap-2 rounded-lg border border-[#d2dbcb] bg-white px-3 text-sm font-medium text-[#314036] hover:bg-[#eef4ea]"
                onClick={logout}
                type="button"
              >
                <LogOut size={16} aria-hidden="true" />
                Disconnect
              </button>
            ) : (
              <a
                className={[
                  "inline-flex h-10 items-center gap-2 rounded-lg px-3 text-sm font-semibold",
                  session?.spotifyConfigured === false
                    ? "pointer-events-none bg-[#d9dfd2] text-[#6b746c]"
                    : "bg-[#1db954] text-[#102016] hover:bg-[#19a84c]",
                ].join(" ")}
                href="/api/auth/login"
              >
                <PlugZap size={17} aria-hidden="true" />
                Connect Spotify
              </a>
            )}
          </div>
        </header>

        {error ? (
          <div className="flex items-start gap-3 rounded-lg border border-[#edc7bd] bg-[#fff4f1] p-3 text-sm text-[#873623]">
            <CircleAlert size={18} aria-hidden="true" />
            <span>{error}</span>
          </div>
        ) : null}

        {session?.setupSteps.length ? (
          <div className="rounded-lg border border-[#ead39e] bg-[#fff8e8] p-3 text-sm text-[#6e4b0e]">
            {session.setupSteps.join(" ")}
          </div>
        ) : null}

        <section className="grid gap-5 lg:grid-cols-[390px_minmax(0,1fr)]">
          <div className="rounded-lg border border-[#dfe6d8] bg-white p-4 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[12px] uppercase text-[#6b746c]">Start with</p>
                <h2 className="mt-1 text-xl font-semibold">A playlist or one song</h2>
              </div>
              <Sparkles size={21} className="text-[#0b6b62]" aria-hidden="true" />
            </div>

            <div className="mt-4 grid grid-cols-2 gap-2 rounded-lg bg-[#edf3e9] p-1">
              <button
                className={modeButtonClass(mode === "playlist")}
                onClick={() => setMode("playlist")}
                type="button"
              >
                <ListMusic size={16} aria-hidden="true" />
                Playlist
              </button>
              <button
                className={modeButtonClass(mode === "song")}
                onClick={() => setMode("song")}
                type="button"
              >
                <Music2 size={16} aria-hidden="true" />
                Song
              </button>
            </div>

            {mode === "playlist" ? (
              <div className="mt-4">
                <label className="text-sm font-medium text-[#344238]" htmlFor="playlist">
                  Your playlist
                </label>
                <select
                  className="mt-2 h-11 w-full rounded-lg border border-[#d2dbcb] bg-white px-3 text-sm"
                  id="playlist"
                  value={selectedPlaylistId}
                  onChange={(event) => void loadPlaylistTracks(event.target.value)}
                >
                  {playlists.map((playlist) => (
                    <option key={playlist.id} value={playlist.id}>
                      {playlist.name}
                    </option>
                  ))}
                </select>

                <PlaylistPreview
                  loading={loadingTracks}
                  playlist={selectedPlaylist}
                  tracks={visibleTracks}
                />
              </div>
            ) : (
              <div className="mt-4">
                <form className="flex gap-2" onSubmit={searchSpotify}>
                  <input
                    className="h-11 min-w-0 flex-1 rounded-lg border border-[#d2dbcb] bg-white px-3 text-sm"
                    onChange={(event) => setSearchTerm(event.target.value)}
                    placeholder="Search for a song"
                    value={searchTerm}
                  />
                  <button
                    className="inline-flex h-11 items-center justify-center rounded-lg bg-[#0b6b62] px-3 text-sm font-semibold text-white hover:bg-[#095d55]"
                    disabled={searching}
                    type="submit"
                  >
                    {searching ? (
                      <Loader2 className="animate-spin" size={17} aria-hidden="true" />
                    ) : (
                      <Search size={17} aria-hidden="true" />
                    )}
                  </button>
                </form>

                <div className="mt-3 grid gap-2">
                  {(searchResults.length ? searchResults : demoTracks).slice(0, 5).map((track) => (
                    <button
                      className={[
                        "flex items-center gap-3 rounded-lg border p-2 text-left text-sm transition",
                        selectedTrack?.id === track.id
                          ? "border-[#1db954] bg-[#effaf2]"
                          : "border-[#dfe6d8] bg-white hover:bg-[#f5f8f2]",
                      ].join(" ")}
                      key={`${track.id}-${track.name}`}
                      onClick={() => setSelectedTrack(track)}
                      type="button"
                    >
                      <Cover src={track.imageUrl} label={track.name} size="sm" />
                      <span className="min-w-0">
                        <span className="block truncate font-medium">{track.name}</span>
                        <span className="block truncate text-[#6b746c]">{track.artistName}</span>
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            <button
              className="mt-4 inline-flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-[#19211d] px-4 text-sm font-semibold text-white hover:bg-[#28332d] disabled:cursor-not-allowed disabled:bg-[#9aa497]"
              disabled={running || sessionLoading}
              onClick={runRecommendations}
              type="button"
            >
              {running ? <Loader2 className="animate-spin" size={17} /> : <Play size={17} />}
              Find my song twins
            </button>

            <div className="mt-4 grid grid-cols-3 gap-2">
              <MiniStat icon={<Headphones size={16} />} label="Seeds" value={sourceSummary.seedsAnalyzed} />
              <MiniStat icon={<Heart size={16} />} label="Matches" value={recommendations.length} />
              <MiniStat icon={<CheckCircle2 size={16} />} label="Linked" value={sourceSummary.spotifyMatches} />
            </div>
          </div>

          <div className="min-w-0">
            <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-[12px] uppercase text-[#6b746c]">Matches</p>
                <h2 className="text-2xl font-semibold">Songs to try next</h2>
              </div>
              <div className="flex flex-wrap gap-2">
                <SourceBadge summary={sourceSummary} />
                {sourceSummary.notes.slice(0, 1).map((note) => (
                  <span
                    className="rounded-lg border border-[#dfe6d8] bg-white px-2 py-1 text-[12px] text-[#506052]"
                    key={note}
                  >
                    {note}
                  </span>
                ))}
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {recommendations.map((track) => (
                <RecommendationCard key={`${track.rank}-${track.name}`} track={track} />
              ))}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

function StatusPill({ connected, loading }: { connected: boolean; loading: boolean }) {
  return (
    <div className="inline-flex h-10 items-center gap-2 rounded-lg border border-[#d2dbcb] bg-white px-3 text-sm">
      {loading ? (
        <Loader2 className="animate-spin text-[#6b746c]" size={16} aria-hidden="true" />
      ) : connected ? (
        <CheckCircle2 className="text-[#1db954]" size={16} aria-hidden="true" />
      ) : (
        <CircleAlert className="text-[#bc7a1d]" size={16} aria-hidden="true" />
      )}
      <span>{loading ? "Checking" : connected ? "Spotify linked" : "Demo mode"}</span>
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
    <div className="rounded-lg border border-[#dfe6d8] bg-[#f8faf5] p-3">
      <div className="flex items-center justify-between gap-2 text-[#0b6b62]">
        {icon}
        <span className="text-lg font-semibold text-[#17201b]">{value}</span>
      </div>
      <p className="mt-1 text-[12px] text-[#6b746c]">{label}</p>
    </div>
  );
}

function PlaylistPreview({
  loading,
  playlist,
  tracks,
}: {
  loading: boolean;
  playlist?: PlaylistSummary;
  tracks: SimplifiedTrack[];
}) {
  return (
    <div className="mt-3">
      <div className="flex items-center gap-3 rounded-lg border border-[#dfe6d8] bg-[#f8faf5] p-3">
        <Cover src={playlist?.imageUrl} label={playlist?.name ?? "Playlist"} size="md" />
        <div className="min-w-0">
          <p className="truncate font-medium">{playlist?.name ?? "Playlist"}</p>
          <p className="text-sm text-[#6b746c]">
            {loading ? "Loading songs" : `${playlist?.totalTracks ?? tracks.length} songs`}
          </p>
        </div>
      </div>
      <div className="mt-2 grid max-h-[248px] gap-1 overflow-auto">
        {loading ? (
          <div className="flex items-center gap-2 p-2 text-sm text-[#6b746c]">
            <Loader2 className="animate-spin" size={16} />
            Loading
          </div>
        ) : (
          tracks.map((track) => (
            <div className="flex items-center gap-2 rounded-lg px-2 py-1.5" key={`${track.id}-${track.name}`}>
              <Cover src={track.imageUrl} label={track.name} size="xs" />
              <div className="min-w-0 text-sm">
                <p className="truncate font-medium">{track.name}</p>
                <p className="truncate text-[#6b746c]">{track.artistName}</p>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function RecommendationCard({ track }: { track: Recommendation }) {
  return (
    <article className="rounded-lg border border-[#dfe6d8] bg-white p-3 shadow-sm">
      <div className="flex gap-3">
        <Cover src={track.imageUrl} label={track.name} size="lg" />
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="truncate font-semibold">{track.name}</p>
              <p className="truncate text-sm text-[#6b746c]">{track.artistName}</p>
            </div>
            <span className="shrink-0 rounded-lg bg-[#e8f8ed] px-2 py-1 text-[12px] font-semibold text-[#106a32]">
              {track.score}
            </span>
          </div>

          <div className="mt-3 h-2 overflow-hidden rounded-full bg-[#e4eadf]">
            <div
              className="h-full rounded-full bg-[#1db954]"
              style={{ width: `${Math.max(4, Math.min(track.score, 100))}%` }}
            />
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <span className={signalClass(track.signal)}>{signalLabel(track.signal)}</span>
            <span className="text-[12px] text-[#6b746c]">{track.confidence}% fit</span>
          </div>
        </div>
      </div>

      <p className="mt-3 truncate text-sm text-[#344238]">
        Near {track.seedNames.slice(0, 3).join(", ")}
      </p>

      {track.spotifyUrl || track.lastFmUrl ? (
        <a
          className="mt-3 inline-flex h-9 items-center gap-1 rounded-lg border border-[#d2dbcb] px-2 text-sm font-medium hover:bg-[#f3f6ef]"
          href={track.spotifyUrl ?? track.lastFmUrl}
          rel="noreferrer"
          target="_blank"
        >
          Open
          <ExternalLink size={14} aria-hidden="true" />
        </a>
      ) : null}
    </article>
  );
}

function Cover({
  src,
  label,
  size,
}: {
  src?: string;
  label: string;
  size: "xs" | "sm" | "md" | "lg";
}) {
  const sizeClass =
    size === "xs" ? "h-8 w-8" : size === "sm" ? "h-10 w-10" : size === "md" ? "h-12 w-12" : "h-20 w-20";

  return (
    <div
      className={`${sizeClass} flex shrink-0 items-center justify-center overflow-hidden rounded-lg bg-[#e8eee4] text-[#0b6b62]`}
    >
      {src ? (
        <img alt={`${label} artwork`} className="h-full w-full object-cover" src={src} />
      ) : (
        <Music2 size={size === "xs" ? 15 : 20} aria-hidden="true" />
      )}
    </div>
  );
}

function SourceBadge({ summary }: { summary: RecommendationResponse["sourceSummary"] }) {
  const label =
    summary.provider === "lastfm"
      ? "Co-listening"
      : summary.provider === "listenbrainz"
        ? "Listener graph"
      : summary.provider === "demo"
        ? "Demo graph"
        : "Fallback";

  return (
    <span className="rounded-lg bg-[#17201b] px-2 py-1 text-[12px] font-semibold text-white">
      {label}
    </span>
  );
}

function modeButtonClass(active: boolean) {
  return [
    "inline-flex h-10 items-center justify-center gap-2 rounded-lg text-sm font-semibold",
    active ? "bg-white text-[#19211d] shadow-sm" : "text-[#566156] hover:bg-white/60",
  ].join(" ");
}

function signalLabel(signal: Recommendation["signal"]) {
  if (signal === "lastfm-co-listening") {
    return "Listeners";
  }

  if (signal === "listenbrainz-collaborative") {
    return "Listeners";
  }

  if (signal === "demo-co-listening") {
    return "Demo";
  }

  return "Artist";
}

function signalClass(signal: Recommendation["signal"]) {
  const base = "inline-flex rounded-lg px-2 py-1 text-[12px] font-semibold";
  if (signal === "lastfm-co-listening" || signal === "listenbrainz-collaborative") {
    return `${base} bg-[#e8f8ed] text-[#106a32]`;
  }

  if (signal === "demo-co-listening") {
    return `${base} bg-[#e8f1f7] text-[#315a7d]`;
  }

  return `${base} bg-[#fff1dd] text-[#895511]`;
}

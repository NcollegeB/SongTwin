export type SpotifyTokenSession = {
  accessToken: string;
  refreshToken?: string;
  expiresAt: number;
  scope?: string;
  tokenType?: string;
  connectedAt: number;
};

export type SpotifyProfile = {
  id: string;
  displayName: string;
  email?: string;
  imageUrl?: string;
  spotifyUrl?: string;
};

export type PlaylistSummary = {
  id: string;
  name: string;
  owner: string;
  ownerId?: string;
  totalTracks: number;
  collaborative?: boolean;
  source?: "liked" | "playlist";
  imageUrl?: string;
  spotifyUrl?: string;
};

export type SimplifiedTrack = {
  id?: string;
  name: string;
  artistName: string;
  artistId?: string;
  albumName?: string;
  imageUrl?: string;
  spotifyUrl?: string;
  lastFmUrl?: string;
  durationMs?: number;
  popularity?: number;
};

export type Recommendation = SimplifiedTrack & {
  rank: number;
  score: number;
  confidence: number;
  support: number;
  signal: "lastfm-co-listening" | "listenbrainz-collaborative";
  reason: string;
  seedNames: string[];
  matchedOnSpotify: boolean;
};

export type RecommendationResponse = {
  recommendations: Recommendation[];
  sourceSummary: {
    provider: "lastfm" | "listenbrainz" | "idle";
    lastFmConfigured: boolean;
    seedsAnalyzed: number;
    spotifyMatches: number;
    notes: string[];
  };
};

export type ApiSessionResponse = {
  connected: boolean;
  spotifyConfigured: boolean;
  lastFmConfigured: boolean;
  profile?: SpotifyProfile;
  expiresAt?: number;
  setupSteps: string[];
};

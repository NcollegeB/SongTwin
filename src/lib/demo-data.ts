import type { PlaylistSummary, Recommendation, SimplifiedTrack } from "./types";

export const demoPlaylists: PlaylistSummary[] = [
  {
    id: "demo-growth-pop",
    name: "Friday drive songs",
    owner: "SongTwin Demo",
    totalTracks: 38,
    imageUrl:
      "https://images.unsplash.com/photo-1516280440614-37939bbacd81?auto=format&fit=crop&w=400&q=80",
  },
  {
    id: "demo-retail-indie",
    name: "Indie favorites",
    owner: "SongTwin Demo",
    totalTracks: 42,
    imageUrl:
      "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?auto=format&fit=crop&w=400&q=80",
  },
];

export const demoTracks: SimplifiedTrack[] = [
  {
    id: "demo-1",
    name: "Electric Feel",
    artistName: "MGMT",
    albumName: "Oracular Spectacular",
    imageUrl:
      "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=400&q=80",
    popularity: 82,
  },
  {
    id: "demo-2",
    name: "Sweet Disposition",
    artistName: "The Temper Trap",
    albumName: "Conditions",
    imageUrl:
      "https://images.unsplash.com/photo-1511379938547-c1f69419868d?auto=format&fit=crop&w=400&q=80",
    popularity: 79,
  },
  {
    id: "demo-3",
    name: "Midnight City",
    artistName: "M83",
    albumName: "Hurry Up, We're Dreaming",
    imageUrl:
      "https://images.unsplash.com/photo-1500534623283-312aade485b7?auto=format&fit=crop&w=400&q=80",
    popularity: 84,
  },
];

export const demoRecommendations: Recommendation[] = [
  {
    rank: 1,
    name: "Kids",
    artistName: "MGMT",
    albumName: "Oracular Spectacular",
    imageUrl:
      "https://images.unsplash.com/photo-1493246507139-91e8fad9978e?auto=format&fit=crop&w=400&q=80",
    score: 96,
    confidence: 91,
    support: 3,
    signal: "demo-co-listening",
    reason: "Shared listener overlap across the seed cluster.",
    seedNames: ["Electric Feel", "Sweet Disposition", "Midnight City"],
    matchedOnSpotify: true,
  },
  {
    rank: 2,
    name: "1901",
    artistName: "Phoenix",
    albumName: "Wolfgang Amadeus Phoenix",
    imageUrl:
      "https://images.unsplash.com/photo-1498038432885-c6f3f1b912ee?auto=format&fit=crop&w=400&q=80",
    score: 92,
    confidence: 87,
    support: 3,
    signal: "demo-co-listening",
    reason: "Frequently co-occurs with indie-electronic playlist saves.",
    seedNames: ["Electric Feel", "Midnight City"],
    matchedOnSpotify: true,
  },
  {
    rank: 3,
    name: "Young Folks",
    artistName: "Peter Bjorn and John",
    albumName: "Writer's Block",
    imageUrl:
      "https://images.unsplash.com/photo-1483412033650-1015ddeb83d1?auto=format&fit=crop&w=400&q=80",
    score: 88,
    confidence: 83,
    support: 2,
    signal: "demo-co-listening",
    reason: "Adjacent audience behavior from comparable scrobble graphs.",
    seedNames: ["Sweet Disposition", "Electric Feel"],
    matchedOnSpotify: true,
  },
];

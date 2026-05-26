export const siteConfig = {
  name: "SongTwin",
  url: process.env.NEXT_PUBLIC_SITE_URL || "https://song-twin.vercel.app",
  title: "SongTwin - Find your next perfect song",
  description:
    "Find songs that fit the music you already love with SongTwin's multi-source discovery algorithm.",
  keywords: [
    "song recommender",
    "music discovery app",
    "find similar songs",
    "playlist recommendations",
    "Spotify playlist recommendations",
    "Tame Impala recommendations",
    "new music finder",
    "SongTwin",
  ],
  price: "4.99",
} as const;

export function absoluteUrl(path = "/") {
  return new URL(path, siteConfig.url).toString();
}

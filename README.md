# SongTwin

SongTwin is a consumer Spotify web app for finding songs similar to a playlist or a single track. It connects to Spotify for account access, playlist browsing, and catalog search, then uses listener-overlap data to rank songs that tend to be liked by the same people.

## Features

- Spotify login with PKCE and encrypted HTTP-only session cookies.
- Choose Liked Songs, a playlist you own/collaborate on, or search for a single song.
- Generate ranked song matches from listener-overlap data.
- Use Last.fm `track.getSimilar` when a Last.fm API key is configured.
- Fall back to ListenBrainz collaborative-listening data when Last.fm is not configured.
- Map recommendation candidates back to Spotify tracks so users can open them directly.
- Clear empty states when true listener-overlap data is unavailable.

## API Reality

Spotify announced on November 27, 2024 that new Web API use cases can no longer access several endpoints and features, including recommendations, related artists, audio features, and audio analysis. Spotify also does not expose a public global graph of who liked which tracks.

SongTwin therefore uses Spotify for identity, readable user sources, search, and track links. Spotify's current playlist-items endpoint only returns tracks for playlists owned by the current user or playlists where the user is a collaborator, so followed/editorial playlists are intentionally not shown as seed sources. The “people who liked/listened to this also liked/listened to” signal comes from collaborative-listening sources:

- Last.fm `track.getSimilar` when `LASTFM_API_KEY` is configured.
- ListenBrainz Labs similar recordings as a no-key collaborative fallback.

SongTwin intentionally avoids filling results with same-artist Spotify catalog proximity when the collaborative sources return nothing. That keeps weak "more songs by this artist" results from being confused with real listener-overlap data.

References:

- [Spotify Web API changes](https://developer.spotify.com/blog/2024-11-27-changes-to-the-web-api)
- [Spotify Authorization Code with PKCE](https://developer.spotify.com/documentation/web-api/tutorials/code-pkce-flow)
- [Spotify Get Playlist Items](https://developer.spotify.com/documentation/web-api/reference/get-playlists-items)
- [Last.fm track.getSimilar](https://www.last.fm/api/show/track.getSimilar)
- [ListenBrainz Labs similar recordings](https://labs.api.listenbrainz.org/similar-recordings)

## Local Setup

1. Create a Spotify app in the Spotify Developer Dashboard.
2. Add this redirect URI to the Spotify app:

```text
http://127.0.0.1:3000/api/auth/callback
```

3. Copy the example env file:

```bash
cp .env.example .env.local
```

4. Fill in:

```bash
SPOTIFY_CLIENT_ID=your_spotify_client_id
SPOTIFY_REDIRECT_URI=http://127.0.0.1:3000/api/auth/callback
SESSION_SECRET=your_long_random_secret
LASTFM_API_KEY=your_lastfm_api_key_optional_but_recommended
MUSICBRAINZ_USER_AGENT=SongTwin/0.1 (you@example.com)
```

5. Start the app:

```bash
npm install
npm run dev
```

6. Open [http://127.0.0.1:3000](http://127.0.0.1:3000).

## Deployment

### Vercel

SongTwin is a standard Next.js app and can deploy to Vercel from the GitHub repo or the Vercel CLI.

[Deploy from GitHub on Vercel](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2FNcollegeB%2FSongTwin&project-name=song-twin&repository-name=SongTwin&env=SPOTIFY_CLIENT_ID,SPOTIFY_REDIRECT_URI,SESSION_SECRET,LASTFM_API_KEY,MUSICBRAINZ_USER_AGENT)

Required production environment variables:

```bash
SPOTIFY_CLIENT_ID=your_spotify_client_id
SESSION_SECRET=your_long_random_secret
LASTFM_API_KEY=your_lastfm_api_key
MUSICBRAINZ_USER_AGENT=SongTwin/0.1 (you@example.com)
```

`SPOTIFY_REDIRECT_URI` is optional in production. If it is omitted, SongTwin uses the current site origin and sends Spotify to:

```text
https://your-vercel-domain.vercel.app/api/auth/callback
```

After Vercel gives you a production domain, add that exact callback URL to your Spotify app's redirect URI list. Vercel environment variable changes only apply to new deployments.

When this repo is connected to Vercel through the GitHub integration, pushes to `main` create a new production deployment automatically. Pull requests and non-production branches create preview deployments.

CLI flow:

```bash
npm i -g vercel
vercel link
vercel env add SPOTIFY_CLIENT_ID production
vercel env add SESSION_SECRET production
vercel env add LASTFM_API_KEY production
vercel env add MUSICBRAINZ_USER_AGENT production
vercel deploy --prod
```

### Self-hosted

Run it on a PC or server with Node:

```bash
npm ci
npm run build
npm run start
```

Or run the Docker image:

```bash
docker build -t song-twin .
docker run --env-file .env.local -p 3000:3000 song-twin
```

## Scripts

```bash
npm run dev
npm run lint
npm run build
```

## Notes

- Spotify tokens stay server-side.
- Changing `SESSION_SECRET` invalidates existing sessions.
- Without `LASTFM_API_KEY`, SongTwin tries ListenBrainz first. If neither collaborative source returns cross-artist matches, it shows an empty listener-graph state instead of same-artist catalog filler.

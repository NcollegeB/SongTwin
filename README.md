# SongTwin

SongTwin is a consumer Spotify web app for finding songs similar to a playlist or a single track. It connects to Spotify for account access, playlist browsing, and catalog search, then uses listener-overlap data to rank songs that tend to be liked by the same people.

## Features

- Spotify login with PKCE and encrypted HTTP-only session cookies.
- Choose Liked Songs, a playlist you own/collaborate on, or search for a single song.
- Generate ranked song matches from listener-overlap data.
- Use Last.fm `track.getSimilar` when a Last.fm API key is configured.
- Fall back to ListenBrainz collaborative-listening data when Last.fm is not configured.
- Map recommendation candidates back to Spotify tracks so users can open them directly.
- Demo mode for trying the interface before credentials are configured.
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

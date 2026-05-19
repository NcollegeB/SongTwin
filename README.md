# SongTwin

SongTwin is a consumer Spotify web app for finding songs similar to a playlist or a single track. It connects to Spotify for account access, playlist browsing, and catalog search, then uses listener-overlap data to rank songs that tend to be liked by the same people.

## Features

- Spotify login with PKCE and encrypted HTTP-only session cookies.
- Choose one of your Spotify playlists or search for a single song.
- Generate ranked song matches from Last.fm `track.getSimilar` co-listening data.
- Map recommendation candidates back to Spotify tracks so users can open them directly.
- Demo mode for trying the interface before credentials are configured.
- Clear fallback labeling when Last.fm is not configured.

## API Reality

Spotify announced on November 27, 2024 that new Web API use cases can no longer access several endpoints and features, including recommendations, related artists, audio features, and audio analysis. SongTwin therefore uses Spotify for identity and catalog data, and Last.fm for the “people who liked this also liked” signal.

References:

- [Spotify Web API changes](https://developer.spotify.com/blog/2024-11-27-changes-to-the-web-api)
- [Spotify Authorization Code with PKCE](https://developer.spotify.com/documentation/web-api/tutorials/code-pkce-flow)
- [Last.fm track.getSimilar](https://www.last.fm/api/show/track.getSimilar)

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
LASTFM_API_KEY=your_lastfm_api_key
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
- Without `LASTFM_API_KEY`, SongTwin still runs, but it labels recommendations as fallback matches.

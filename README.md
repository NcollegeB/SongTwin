# SongTwin

SongTwin is a consumer song discovery web app for finding tracks that fit a playlist or a single track. It lets paid users search songs without Spotify, optionally connect Spotify for playlist and liked-song import, then compiles signals from multiple music databases and websites into one discovery algorithm.

## Features

- Public landing page with $4.99/month SongTwin Pro positioning.
- Firebase Auth account login for paid users.
- Firestore-backed subscription mirror for access control.
- Stripe Checkout, Stripe Billing Portal, and signed webhook handling.
- Optional Spotify login with PKCE and encrypted HTTP-only session cookies.
- Search songs without Spotify, or choose Liked Songs and playlists when Spotify is connected.
- Generate ranked song matches from a multi-source music algorithm.
- Use an optional expanded graph API key for broader matching.
- Fall back to a standard public music graph when the expanded graph is not configured.
- Map recommendation candidates back to Spotify when connected, with Spotify search and YouTube links available for public-catalog results.
- Privacy, Terms, Contact, FAQ, and launch-ready pricing copy.
- Clear empty states when strong cross-artist fit signals are unavailable.

## API Reality

Spotify announced on November 27, 2024 that new Web API use cases can no longer access several endpoints and features, including recommendations, related artists, audio features, and audio analysis. Spotify also does not expose a public global graph of who liked which tracks.

SongTwin therefore does not depend on Spotify for core song search or recommendation runs. Spotify is optional and is used for readable user sources, playlist/liked-song import, profile display, and exact track links when available. Spotify's current playlist-items endpoint only returns tracks for playlists owned by the current user or playlists where the user is a collaborator, so followed/editorial playlists are intentionally not shown as seed sources. The discovery signal is compiled from multiple music databases, public catalog data, and music-web sources:

- Expanded graph matching when `SONGTWIN_GRAPH_API_KEY` is configured.
- Standard public graph matching as a no-key fallback.

SongTwin intentionally avoids filling results with same-artist Spotify catalog proximity when the algorithm returns nothing. That keeps weak "more songs by this artist" results from being confused with stronger fit signals.

References:

- [Spotify Web API changes](https://developer.spotify.com/blog/2024-11-27-changes-to-the-web-api)
- [Spotify Authorization Code with PKCE](https://developer.spotify.com/documentation/web-api/tutorials/code-pkce-flow)
- [Spotify Get Playlist Items](https://developer.spotify.com/documentation/web-api/reference/get-playlists-items)

## Local Setup

1. Optional: create a Spotify app in the Spotify Developer Dashboard if you want playlist import locally.
2. Add this redirect URI to the Spotify app:

```text
http://127.0.0.1:3000/api/auth/callback
```

3. Copy the example env file:

```bash
cp .env.example .env.local
```

4. Fill in the variables you need. Firebase and Stripe are required for paid account access. Spotify is optional for song-search-only testing.

```bash
SPOTIFY_CLIENT_ID=your_spotify_client_id
SPOTIFY_REDIRECT_URI=http://127.0.0.1:3000/api/auth/callback
SESSION_SECRET=your_long_random_secret
SONGTWIN_GRAPH_API_KEY=optional_expanded_graph_api_key
MUSICBRAINZ_USER_AGENT=SongTwin/0.1 (you@example.com)

NEXT_PUBLIC_FIREBASE_API_KEY=your_firebase_web_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_firebase_web_app_id
FIREBASE_SERVICE_ACCOUNT_BASE64=base64_encoded_service_account_json

STRIPE_SECRET_KEY=sk_test_or_live_key
STRIPE_PRICE_ID=price_recurring_499_monthly
STRIPE_WEBHOOK_SECRET=whsec_from_stripe_webhook
SONGTWIN_ADMIN_CODE_HASH=sha256_hash_of_private_admin_code
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

[Deploy from GitHub on Vercel](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2FNcollegeB%2FSongTwin&project-name=song-twin&repository-name=SongTwin&env=SPOTIFY_CLIENT_ID,SPOTIFY_REDIRECT_URI,SESSION_SECRET,SONGTWIN_GRAPH_API_KEY,MUSICBRAINZ_USER_AGENT,NEXT_PUBLIC_FIREBASE_API_KEY,NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,NEXT_PUBLIC_FIREBASE_PROJECT_ID,NEXT_PUBLIC_FIREBASE_APP_ID,FIREBASE_SERVICE_ACCOUNT_BASE64,STRIPE_SECRET_KEY,STRIPE_PRICE_ID,STRIPE_WEBHOOK_SECRET,SONGTWIN_ADMIN_CODE_HASH)

Required production environment variables for paid access:

```bash
SESSION_SECRET=your_long_random_secret
SONGTWIN_GRAPH_API_KEY=optional_expanded_graph_api_key
MUSICBRAINZ_USER_AGENT=SongTwin/0.1 (you@example.com)
NEXT_PUBLIC_FIREBASE_API_KEY=your_firebase_web_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_firebase_web_app_id
FIREBASE_SERVICE_ACCOUNT_BASE64=base64_encoded_service_account_json
STRIPE_SECRET_KEY=sk_live_or_test_key
STRIPE_PRICE_ID=price_recurring_499_monthly
STRIPE_WEBHOOK_SECRET=whsec_from_stripe_webhook
SONGTWIN_ADMIN_CODE_HASH=sha256_hash_of_private_admin_code
```

Optional production variables for Spotify playlist import:

```bash
SPOTIFY_CLIENT_ID=your_spotify_client_id
SPOTIFY_REDIRECT_URI=https://your-domain.example/api/auth/callback
```

SongTwin uses Stripe-hosted Checkout. A Stripe publishable key is not required for this redirect flow because the server creates the Checkout Session and returns Stripe's hosted checkout URL.
`SONGTWIN_ADMIN_CODE_HASH` is optional and enables admin-code access from the account settings page. Generate it from a private code that is not committed:

```bash
read -s CODE
node -e "const crypto=require('node:crypto'); console.log(crypto.createHash('sha256').update(process.argv[1]).digest('hex'))" "$CODE"
unset CODE
```

Use a long random code. A short or public code remains guessable even when only the hash is stored. You can also grant one user permanent access by setting `admin: true` on their `users/{uid}` Firestore document.

`SPOTIFY_REDIRECT_URI` is optional in production. If it is omitted, SongTwin uses the current site origin and sends Spotify to:

```text
https://your-vercel-domain.vercel.app/api/auth/callback
```

After Vercel gives you a production domain, add that exact callback URL to your Spotify app's redirect URI list. Vercel environment variable changes only apply to new deployments.

When this repo is connected to Vercel through the GitHub integration, pushes to `main` create a new production deployment automatically. Pull requests and non-production branches create preview deployments.

### Stripe and Firebase

1. In Firebase, create a web app, enable Email/Password authentication, and create/download a service account key for the Admin SDK.
2. In Stripe, create a product named `SongTwin Pro` and a recurring monthly Price for `$4.99`.
3. Copy the recurring Price ID that starts with `price_`. Do not use the Product ID that starts with `prod_`.
4. Add the Stripe webhook endpoint:

```text
https://your-vercel-domain.vercel.app/api/stripe/webhook
```

Listen for these events:

```text
checkout.session.completed
customer.subscription.created
customer.subscription.updated
customer.subscription.deleted
invoice.paid
invoice.payment_failed
```

5. SongTwin adds a 3-day free trial when it creates the Stripe Checkout Session.
6. Copy the webhook signing secret that starts with `whsec_`.
7. Add the Firebase and Stripe environment variables in Vercel, then redeploy.

CLI flow:

```bash
npm i -g vercel
vercel link
vercel env add SPOTIFY_CLIENT_ID production
vercel env add SESSION_SECRET production
vercel env add SONGTWIN_GRAPH_API_KEY production
vercel env add MUSICBRAINZ_USER_AGENT production
vercel env add NEXT_PUBLIC_FIREBASE_API_KEY production
vercel env add NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN production
vercel env add NEXT_PUBLIC_FIREBASE_PROJECT_ID production
vercel env add NEXT_PUBLIC_FIREBASE_APP_ID production
vercel env add FIREBASE_SERVICE_ACCOUNT_BASE64 production
vercel env add STRIPE_SECRET_KEY production
vercel env add STRIPE_PRICE_ID production
vercel env add STRIPE_WEBHOOK_SECRET production
vercel env add SONGTWIN_ADMIN_CODE_HASH production
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
- Stripe webhook signature verification uses the raw request body; do not parse JSON before verification.
- Firebase custom claims are updated by the Stripe webhook, but Firestore remains the source of truth for subscription state in the app.
- Without `SONGTWIN_GRAPH_API_KEY`, SongTwin uses its standard public music graph. If the algorithm cannot find strong cross-artist matches, it shows an empty match state instead of same-artist catalog filler.

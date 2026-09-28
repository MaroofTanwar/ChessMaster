# ChessMaster deployment guide

This guide prepares a release; it does not authorize or perform a deployment.

## Recommended architecture

- Host `client/dist` on Firebase Hosting or another static host with SPA rewrites.
- Run `server` as one long-lived Node.js web service on Render, Railway, Fly.io, or an equivalent container/VM platform.
- Keep Firebase Authentication and Cloud Firestore in the existing Firebase project.

The backend must support Node worker threads, child processes, WebSockets, and the installed Stockfish WASM package. A static host or short-lived serverless function is not suitable for Express, Socket.IO, in-memory live rooms, and Stockfish workers. The current room and challenge managers are in memory, so the first production release must run exactly one backend instance. Multiple backend instances require a shared Socket.IO adapter and shared room/presence state, which is outside the current release scope.

## Required environment variables

Frontend build (`client/.env.production`, CI secrets, or host build variables):

- `VITE_FIREBASE_API_KEY`
- `VITE_FIREBASE_AUTH_DOMAIN`
- `VITE_FIREBASE_PROJECT_ID`
- `VITE_FIREBASE_STORAGE_BUCKET`
- `VITE_FIREBASE_MESSAGING_SENDER_ID`
- `VITE_FIREBASE_APP_ID`
- `VITE_FIREBASE_MEASUREMENT_ID` (optional; Analytics is currently disabled)
- `VITE_API_URL` (the public HTTPS backend origin)
- `VITE_SOCKET_URL` (normally the same public HTTPS backend origin)

Backend runtime:

- `NODE_ENV=production`
- `PORT` (usually injected by the host)
- `CLIENT_URL` (comma-separated exact HTTPS frontend origins; no wildcard)
- `FIREBASE_PROJECT_ID`
- `GOOGLE_APPLICATION_CREDENTIALS` (path to a securely mounted service-account file), or workload identity/Application Default Credentials supplied by the host
- `TRUST_PROXY=true` only when the selected host terminates HTTPS through a trusted reverse proxy

Never put Firebase Admin credentials in a `VITE_` variable, frontend build setting, repository file, or browser bundle.

## Firebase preparation

1. In Firebase Console, open **Authentication → Settings → Authorized domains** and add the final frontend hostname.
2. Review `firestore.rules` and `firestore.indexes.json` from the release commit.
3. Confirm the two `games` collection indexes are enabled:
   - `whitePlayerUid` ascending, `endedAt` descending
   - `blackPlayerUid` ascending, `endedAt` descending
4. Use a backend service identity with only the Firebase/Google Cloud permissions needed for Authentication token verification and Firestore access. Store its credential through the hosting provider's secret mechanism.
5. Do not make Firestore collections publicly writable. Completed games, Elo, social records, settings API writes, and analysis caches remain backend controlled where designed.

## Build and pre-deployment checks

From the repository root:

```powershell
npm ci
npm --prefix client ci
npm --prefix server ci --omit=dev --omit=optional
npm --prefix server test
npm --prefix client test
npm --prefix client run lint
npm --prefix client run build
```

Start the production-mode backend locally with valid server credentials, then serve or preview the frontend build using production API/socket URLs. Verify `/api/health`, sign-in, an AI move, a cached/full analysis, and a two-account Socket.IO game.

## Backend service configuration

- Root directory: `server`
- Install command: `npm ci --omit=dev --omit=optional`
- Start command: `npm start`
- Health path: `/api/health`
- WebSockets: enabled
- Instance count: exactly `1`
- Graceful shutdown window: at least 10 seconds
- Use HTTPS at the public edge so Socket.IO upgrades to WSS automatically.

Set `CLIENT_URL` to the exact deployed frontend origin. Do not use `*` with credentialed CORS.

## Frontend hosting configuration

Build from the repository root with `npm --prefix client run build`. The artifact directory is `client/dist`. All application routes must rewrite to `/index.html`; the repository's `firebase.json` contains this rewrite for Firebase Hosting.

The frontend URL is embedded at Vite build time. Rebuild after changing any `VITE_` variable.

## Commands reserved for an approved deployment

These commands are examples for the recommended Firebase Hosting path. Do not run them until deployment is approved:

```powershell
npm --prefix client run build
npx firebase-tools deploy --only firestore:rules,firestore:indexes --project <firebase-project-id>
npx firebase-tools deploy --only hosting --project <firebase-project-id>
```

Deploy the backend through the selected long-lived service using its configured `npm ci --omit=dev --omit=optional` and `npm start` commands. Firestore is an explicit dependency; omitting optional dependencies excludes the unused Firebase Storage client and its advisory-bearing transitive chain. Keep one instance and set the backend variables above before releasing the frontend build.

## Production smoke test

1. Open the frontend over HTTPS and confirm no mixed-content requests.
2. Register/login/logout and refresh a protected route.
3. Verify Settings persist after refresh and re-login.
4. With two accounts, create/join one room, exchange legal moves and chat, reject an illegal move, reconnect, and finish the game.
5. Confirm exactly one completed game document and one ranked Elo update.
6. Finish a casual game and confirm Elo does not change.
7. Run Beginner and Expert AI as both colors; test Undo/Redo and New Game during calculation.
8. Open History → Replay → Analyze Game; verify analysis and cache reuse.
9. Test friend search/request/accept/challenge and confirm one shared room.
10. Check server logs and browser console for errors without exposing tokens or credentials.

## Rollback

- Keep the previous frontend artifact/release available and roll back the static host first if the browser release is faulty.
- Keep the previous backend release/image and its environment configuration available; roll back without changing Firestore data.
- Treat rule/index changes separately. Re-deploy the last reviewed `firestore.rules` if a rules regression occurs. Index creation is additive; do not delete an index during an incident unless its replacement is proven active.
- Never roll back by deleting user, game, social, rating, or analysis data.

## Firebase plan considerations

Authentication and Firestore can operate within no-cost quotas while usage remains within the Firebase project's allowance. Production traffic, outbound services, and hosting can exceed free quotas. The Node/Socket.IO/Stockfish backend requires an external long-lived compute service and is not provided by static Firebase Hosting. Confirm quotas, billing alerts, and the selected backend host plan before launch; do not enable billing automatically.

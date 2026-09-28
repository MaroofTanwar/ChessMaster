# ChessMaster Firebase integration

Firebase Authentication and Firestore serve the React/Vite frontend. Socket.IO
multiplayer is implemented separately in [PHASE6.md](./PHASE6.md).

## Architecture discovered

- Repository root: orchestration package; Firebase JS SDK was previously installed here.
- `client/`: React 19 + Vite 8 + React Router + Tailwind, with existing Login/Register,
  AuthContext, ProtectedRoute, toast components, and local chess via chess.js.
  Vite uses this directory as its root; no custom envDir/root was configured.
- `server/`: Express backend previously using Mongoose, bcrypt, and JWT authentication.
  A real `server/.env` and `server/.env.example` already existed.
- No Firebase configuration or frontend .env existed. Only client/.gitignore existed.
- This directory was not a Git repository during inspection.

The frontend now talks directly to Firebase. Express remains independently runnable
with its health endpoint, ready for future server work. Retired /api/auth and /api/users
routes return HTTP 410. No MongoDB, Mongoose, custom JWT, or password hashing code remains
in the active packages. Existing server/.env was preserved; old database/JWT variables
are unused and can be removed manually. Existing MongoDB accounts/data were not migrated.

## Environment and initialization

Actual .env: `C:\Project\ChessMaster\client\.env`
Trackable template: `C:\Project\ChessMaster\client\.env.example`
Firebase module: `C:\Project\ChessMaster\client\src\config\firebase.js`

The .env uses the values supplied and explicitly authorized in the conversation.
Values are not reproduced in this report. Root and client ignore rules exclude real
environment files while allowing .env.example. Files use UTF-8 without a BOM so Vite
loads the first variable correctly on Windows.

| Vite variable | Firebase web configuration field |
| --- | --- |
| VITE_FIREBASE_API_KEY | apiKey |
| VITE_FIREBASE_AUTH_DOMAIN | authDomain |
| VITE_FIREBASE_PROJECT_ID | projectId |
| VITE_FIREBASE_STORAGE_BUCKET | storageBucket |
| VITE_FIREBASE_MESSAGING_SENDER_ID | messagingSenderId |
| VITE_FIREBASE_APP_ID | appId |
| VITE_FIREBASE_MEASUREMENT_ID | measurementId (optional; Analytics is not initialized) |

Find these in Firebase Console → Project settings → General → Your apps → select the
web app → SDK setup and configuration → Config. Copy the fields into the matching
variables above and restart Vite after changes.
See [Firebase web setup](https://firebase.google.com/docs/web/setup).

The module initializes App, Auth, and Firestore once, reusing the default app across
reloads. Missing/invalid config produces a readable auth message without crashing
the public landing page. The module exports only auth, db, and its setup error.
VITE variables are browser configuration; never put Admin SDK credentials or service-account keys here.

## Authentication and profiles

- Existing Register/Login designs and routes are retained.
- Registration uses email/password, sets displayName, and creates users/{Firebase UID}.
- Login loads an existing profile or safely recovers a missing profile with a transaction.
- Authentication state comes from Firebase onAuthStateChanged. Profile read failures
  do not manufacture or invalidate a Firebase session.
- Checked Remember me uses local persistence; unchecked uses session persistence.
  Registration uses local persistence. Firebase manages tokens; the old custom
  chessmaster_token is removed.
- Logout uses Firebase signOut; protected routes redirect to Login. A logout may
  reach Login before the former page's landing-page navigation completes.
- Password reset sends Firebase's secure reset email. It never accepts a new password
  using only an email address.
- The old hard-coded shared demo account button was removed.
- Usernames are 3–30 trimmed characters. They are display names, not globally unique identities.
- Profile defaults: rating 1200; wins/losses/draws/gamesPlayed 0; avatar empty.
  createdAt/updatedAt use server timestamps.
- No password/token/credential is stored in Firestore.
- Retry Profile recovers a failed profile write without creating another Auth account.
  Until recovery, chess pages can display sensible fallback profile values.
- Firestore timestamps are adapted to the existing profile page's date format.

Firebase errors are mapped to readable messages using the existing error panels/toasts.
A single global ToastContainer now also covers Login/Register and password reset.
See [Firebase persistence](https://firebase.google.com/docs/auth/web/auth-state-persistence)
and [password reset](https://firebase.google.com/docs/auth/web/manage-users).

## Required: publish Firestore rules

**The live project's current rules allowed unauthenticated reads/listing/deletion of
the temporary test profiles. The tested replacement rules have not been deployed.
Publish them before using real user profiles. The Firebase CLI has no signed-in account on this workstation.**

1. Open the Firebase Console and select the same project as client/.env.
2. Open Build → Firestore Database → select the (default) database → Rules.
3. Replace the editor contents with the entire repository-root `firestore.rules` file.
4. Click Publish.
5. Register/sign in again and confirm the owner can read users/{uid}.
   In Rules Playground, unauthenticated and other-UID reads/writes must fail.

The supplied rules permit only owner single-document profile reads, validated profile
creation, and owner username/avatar/updatedAt edits. Authenticated users may read and
query completed game documents only when their UID is the white or black participant.
All client writes to `games` remain denied; Firebase Admin performs those writes.
The rules deny unrelated collection listing, deletion, credential fields, forged initial
stats/timestamps, and client edits to rating, results, email, or createdAt.
Private profiles must not serve as a public leaderboard.

Rules passed the local Firestore emulator tests. They are referenced by firebase.json.
A signed-in Firebase CLI with project permission can alternatively publish them using
`npx firebase deploy --only firestore:rules --project YOUR_PROJECT_ID`.
See [Firestore field validation and access rules](https://firebase.google.com/docs/firestore/security/rules-fields).

## Run and test

From C:\Project\ChessMaster:

```powershell
npm run dev:client
```

Open the URL Vite prints (normally http://localhost:5173).
The Express backend is optional for current Firebase auth/local chess:

```powershell
npm run dev:server
```

In Firebase Console, Authentication → Sign-in method → Email/Password must be enabled.
This was working in the live registration/login verification, and localhost was authorized.
Ensure each deployed hostname is configured under Authentication → Settings → Authorized domains.

Manual account check:

1. Visit /register, enter a username, an email you control, and a strong password.
2. Confirm Dashboard loads with rating 1200 and zero initial statistics.
3. Refresh, then visit /profile and /play; the session should remain signed in.
4. Use the account menu → Sign Out; visiting /dashboard or /play must require login.
5. Sign in again through /login. Check an incorrect password shows a readable message.
6. Test Forgot Password with an inbox you control and follow the received link.
7. Firebase Console → Authentication → Users: locate the registered email and copy its UID.
8. Firebase Console → Firestore Database → Data → users → that UID:
   inspect username/email/avatar/stats/timestamps; confirm no passwords or tokens.

Automated checks:

```powershell
npm --prefix client test
npm --prefix client run build
npm --prefix client run lint
npm run test:rules
```

The Firestore emulator requires Java 21+. On this workstation the default java launcher
was broken; the working JDK was Android Studio's bundled JBR. For this shell:

```powershell
$env:JAVA_HOME = 'C:\Program Files\Android\Android Studio\jbr'
$env:PATH = $env:JAVA_HOME + '\bin;' + $env:PATH
npm run test:rules
```

Opt-in live browser test, with the Vite server running on 127.0.0.1:5173:

```powershell
$env:CHESSMASTER_LIVE_TEST = '1'
npm --prefix client run test:live
```

The script uses headless Microsoft Edge (override CHESSMASTER_BROWSER if needed),
creates a temporary Firebase account/profile, tests the UI, and cleans up its account.
After publishing the restrictive rules, client deletion of its profile will be denied:
the test prints only the test document UID for manual deletion in Firestore Console.
It never logs environment values or passwords/tokens.

## Verification results and limits

- Firebase App/Auth/Firestore initialization: passed with supplied configuration.
- Live email/password registration, Firestore document/defaults/server timestamps: passed.
- Live login, wrong-password message, logout, session refresh, protected routes: passed.
- Landing, Dashboard, Profile, History, Leaderboard, Settings, AI, Play routes: passed.
- Premium board rendered with 64 squares; local e2-e4, undo, redo: passed.
- Live browser run: zero uncaught JavaScript exceptions.
- Auth/session/configuration regression suite: 21 tests passed (including missing config and initialization failures).
- Firestore rules emulator suite: 5 tests passed (owner access and adversarial writes).
- Express health/retired routes/404 smoke checks: passed.
- Production build: passed; Vite reports a large bundle warning.
- Lint: no errors; existing React/unused-import warnings remain.
- Existing chess hooks/components, Play/AI/Dashboard/Profile implementations and game
  assets were preserved. Every game feature was not exhaustively retested.
- Password-reset email delivery was not exercised against a real inbox; SDK behavior
  and account-enumeration-safe handling were tested.
- All temporary accounts and profiles created during this verification were removed.
- Security publication remains a manual Console step. No Phase 6 work was started.

## Files and packages

Created:
- .gitignore, firebase.json, firestore.rules, FIREBASE_SETUP.md
- client/.env, client/.env.example
- client/src/config/firebase.js
- client/src/api/user.api.js
- client/src/utils/firebaseErrors.js
- client/src/components/auth/ProfileNotice.jsx
- client/vitest.config.js
- client/tests/auth.test.jsx, client/tests/firebase-config.test.js, client/tests/firestore.rules.mjs
- client/scripts/verify-live.mjs

Modified:
- Root/client/server package.json and package-lock.json
- client/.gitignore and client/README.md
- client/src/App.jsx, context/AuthContext.jsx, api/auth.api.js
- client/src/pages/LoginPage.jsx, RegisterPage.jsx, LandingPage.jsx (toast placement only)
- client/src/components/auth/ProtectedRoute.jsx, ForgotPasswordModal.jsx
- client/src/components/layout/Navbar.jsx, AppLayout.jsx
- server/src/app.js, server.js, routes/health.routes.js, server/.env.example

Removed obsolete backend files:
- server/src/config/db.js, models/User.js
- server/src/controllers/auth.controller.js, user.controller.js
- server/src/middleware/auth.middleware.js
- server/src/routes/auth.routes.js, user.routes.js

Installed:
- client runtime: firebase
- client development: vitest, jsdom, @testing-library/react, @playwright/test,
  @firebase/rules-unit-testing
- root development: firebase-tools (CLI/emulator tooling)

Removed the misplaced root Firebase JS SDK and server mongoose/bcryptjs/jsonwebtoken dependencies.

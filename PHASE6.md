# ChessMaster Phase 6 — Real-time multiplayer

Phase 6 adds authenticated, server-authoritative two-player chess. Phase 7 features
were not added. The existing local game remains at `/play`; multiplayer is at
`/multiplayer`.

## Architecture

1. The signed-in web client obtains its Firebase ID token and presents it only in
   the Socket.IO connection authentication payload.
2. `server/src/socket/authenticateSocket.js` verifies that token through Firebase
   Admin with revoked-token checking and derives the trusted UID.
3. `GameManager` assigns seats and owns every live room's chess.js instance, FEN,
   move history, player connections, 10-minute clocks, result, draw offer, and
   rematch request.
4. Clients send only intent (`from`, `to`, optional promotion). The server verifies
   membership, status, color, turn, and chess.js legality before broadcasting a
   new snapshot.
5. The server creates immutable completed game documents through Firebase Admin.
   Client Firestore rules deny access to `games`, so browsers cannot forge results.

Rooms use `CHESS-XXXXX` IDs, hold two players, stay in server memory during temporary
disconnects, and are removed after 30 minutes with both players offline. A verified
UID reconnect receives its old seat and authoritative snapshot. Rooms do not survive
a backend process restart; durable active-room recovery is outside this phase.

## Socket events

Client to server: `create_game`, `join_game`, `make_move`, `resign_game`,
`offer_draw`, `accept_draw`, `decline_draw`, `request_rematch`, `accept_rematch`,
`decline_rematch`, `leave_game`.

Server to client: `game_created`, `player_joined`, `game_started`, `game_state`,
`move_applied`, `move_rejected`, `player_disconnected`, `player_reconnected`,
`game_over`, `draw_offered`, `draw_declined`, `rematch_requested`,
`rematch_declined`, `rematch_started`, `socket_error`.

Mutating client events use acknowledgements shaped as `{ ok, data }` or
`{ ok: false, error: { code, message } }`.

## Server clocks and game endings

Each room starts at Rapid 10+0. The server uses elapsed wall-clock milliseconds,
applies elapsed time before every move/action, checks clocks four times per second,
and broadcasts display snapshots when the visible second changes. Browser countdowns
interpolate the latest server snapshot but never determine a timeout.

The server detects checkmate, stalemate, threefold repetition, insufficient material,
the fifty-move rule, resignation, agreed draw, timeout, and voluntary abandonment.
Completed games are stored as `games/{ROOM_ID}-{round}` with trusted player UIDs and
names, normalized moves, result, winner UID, reason, time control, and start/end times.
Rematches reset chess/clocks/history and swap colors while incrementing the round.

## Configuration and commands

Backend-only `server/.env` variables:

```env
PORT=5000
CLIENT_URL=http://localhost:5173
FIREBASE_PROJECT_ID=your-firebase-project-id
GOOGLE_APPLICATION_CREDENTIALS=C:/secure/path/firebase-admin.json
```

Never place the Admin JSON in the repository or expose it through a `VITE_` variable.
For a non-default backend address, add `VITE_SOCKET_URL` to `client/.env`.

From the repository root, use two terminals:

```powershell
npm run dev:server
npm run dev:client
```

Open `http://localhost:5173`. Production must use HTTPS/WSS so Firebase tokens are
encrypted in transit.

## Manual two-user test

1. In a normal browser, sign in as Player A. In a private window or separate browser
   profile, sign in as a different Firebase account for Player B.
2. Player A opens Dashboard → Create Game → Create Secure Room and copies the
   generated `CHESS-XXXXX` ID.
3. Player B opens Dashboard → Join Game Room, enters that ID, and joins.
4. Confirm A is White with a White-oriented board and B is Black with a flipped board.
5. Move for White, then Black. Confirm each move and clock update appears in both windows.
6. Try a move out of turn. The board should not accept it; direct forged socket actions
   are rejected by the server with `NOT_YOUR_TURN` or `ILLEGAL_MOVE`.
7. Refresh or briefly close Player B's game window. Player A sees the disconnect state;
   reopening the room as the same Firebase user restores Black's seat and position.
8. Finish by checkmate, resignation, draw acceptance, or timeout. Both windows receive
   the same final state and game-over modal.
9. Request and accept a rematch. Confirm the initial board/clocks return and colors swap.
10. In Firebase Console → Firestore Database → Data → `games`, open
    `{ROOM_ID}-1` and confirm the trusted completed-game fields. No password, token, or
    Admin credential is stored there.

## Automated verification

```powershell
npm --prefix server test
$env:CHESSMASTER_LIVE_MULTIPLAYER_TEST='1'; npm --prefix server run test:multiplayer

# Start the frontend first, then:
$env:CHESSMASTER_LIVE_BROWSER_TEST='1'; npm --prefix server run test:browser

npm --prefix client test
npm --prefix client run lint
npm --prefix client run build
```

Live scripts create temporary Firebase accounts/documents and delete them in `finally`.
The tested paths include authentication rejection, room capacity, illegal/out-of-turn
moves, server clocks, timeout, resignation, draw handling, disconnect/reconnect,
checkmate persistence, rematch, two-browser UI synchronization, and local/mobile regressions.

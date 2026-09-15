# Gridiron Legends — Colyseus Server (Part 1)

Real matchmaking for the Online portal: 1v1 / 2v2, Public (matchmade) or
Private (6-char code). No gameplay state (cars/ball) is synced yet — that's
Part 2.

## Run locally
```
cd server
npm install
npm start
```
Server listens on `ws://localhost:2567`.

## Deploy (e.g. Render, Railway, Fly.io, Glitch)
1. Push this `server/` folder as its own project/repo.
2. Deploy it as a Node web service (`npm install` then `npm start`).
3. Copy the `https://` URL your host gives you, change it to `wss://`.
4. In `V34.html`, set `COLYSEUS_SERVER_URL` to that `wss://` URL.

## Files
- `index.js` — registers two room types on the same `GridironLobbyRoom` class:
  - `gridiron_public` (matched by `mode`, for Public Match)
  - `gridiron_private` (matched by `code`, for Create/Join Private Match)
- `rooms/GridironLobbyRoom.js` — tracks connected players (name, team) for a
  1v1 (max 2) or 2v2 (max 4) room. No match logic yet.

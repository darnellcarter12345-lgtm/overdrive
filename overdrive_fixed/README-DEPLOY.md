# Overdrive Render build

This build uses one Render web service for both the HTTPS game page and the Colyseus WebSocket lobby.

Root files needed in GitHub:
- index.html
- package.json
- server.js
- render.yaml

The game automatically connects to the same Render hostname using `wss://` when the page is served over HTTPS.

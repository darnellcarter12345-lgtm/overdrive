// Gridiron Legends — Colyseus server entry point (Part 1: online portal only).
const http = require("http");
const express = require("express");
const { Server } = require("colyseus");
const { GridironLobbyRoom } = require("./rooms/GridironLobbyRoom");

const app = express();
app.get("/", (req, res) => res.send("Gridiron Legends Colyseus server is running."));

const server = http.createServer(app);
const gameServer = new Server({ server });

// Public matches: joinOrCreate groups any two clients requesting the same
// mode ("1v1"/"2v2") into the same open room.
gameServer.define("gridiron_public", GridironLobbyRoom).filterBy(["mode"]);

// Private matches: the creator picks a 6-char code; a joiner's client.join()
// call only succeeds if a room with that exact code is currently open.
gameServer.define("gridiron_private", GridironLobbyRoom).filterBy(["code"]);

const port = Number(process.env.PORT) || 2567;
gameServer.listen(port);
console.log(`Gridiron Legends Colyseus server listening on ws://localhost:${port}`);

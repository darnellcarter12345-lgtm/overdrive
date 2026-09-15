// GridironLobbyRoom — PART 1 scope only.
// Tracks real players joining a waiting room for a 1v1 or 2v2 match,
// public (matchmade) or private (joined by a 6-char code). No car/ball
// state or match simulation lives here yet — that's Part 2.

const { Room } = require("colyseus");
const { Schema, MapSchema, defineTypes } = require("@colyseus/schema");

class Player extends Schema {}
defineTypes(Player, {
  name: "string",
  team: "string", // "blue" | "orange"
});

class LobbyState extends Schema {
  constructor() {
    super();
    this.players = new MapSchema();
  }
}
defineTypes(LobbyState, {
  mode: "string",  // "1v1" | "2v2"
  code: "string",  // 6-char code for private rooms, "" for public
  players: { map: Player },
});

class GridironLobbyRoom extends Room {
  onCreate(options) {
    const mode = options && options.mode === "1v1" ? "1v1" : "2v2";
    this.maxClients = mode === "1v1" ? 2 : 4;

    this.setState(new LobbyState());
    this.state.mode = mode;
    this.state.code = (options && options.code) ? String(options.code).toUpperCase().slice(0, 6) : "";

    // Public rooms are matched by mode; private rooms are matched by code.
    // (See index.js — this same class is registered under two room names
    // with different filterBy() so joinOrCreate/join only ever pair up
    // clients who asked for the same thing.)
    this.setMetadata({ mode: this.state.mode, code: this.state.code });
  }

  onJoin(client, options) {
    const player = new Player();
    const requestedName = options && options.name ? String(options.name).trim().slice(0, 16) : "";
    player.name = requestedName || ("Player" + client.sessionId.slice(0, 4));
    // Simple alternating team assignment based on join order.
    player.team = this.state.players.size % 2 === 0 ? "blue" : "orange";
    this.state.players.set(client.sessionId, player);
  }

  onLeave(client) {
    this.state.players.delete(client.sessionId);
  }

  onDispose() {
    // Nothing to clean up yet — no timers/intervals started in Part 1.
  }
}

module.exports = { GridironLobbyRoom };

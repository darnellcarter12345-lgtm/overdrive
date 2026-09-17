// Overdrive — Turbo Clash matchmaking + multiplayer server

const http = require("http");

const { WebSocketServer } = require("ws");

const PORT = process.env.PORT || 3000;

const ROOM_CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

const rooms = new Map();

let nextPlayerId = 1;

function maxForMode(mode) {

  return mode === "1v1" ? 2 : 4;

}

function makeRoomCode() {

  let code;

  do {

    code = "";

    for (let i = 0; i < 6; i++) {

      code += ROOM_CODE_CHARS[Math.floor(Math.random() * ROOM_CODE_CHARS.length)];

    }

  } while (rooms.has(code));

  return code;

}

function teamCounts(room) {

  let blue = 0;

  let orange = 0;

  for (const p of room.players.values()) {

    if (p.team === "blue") blue++;

    else orange++;

  }

  return { blue, orange };

}

function nextTeam(room) {

  const { blue, orange } = teamCounts(room);

  return blue <= orange ? "blue" : "orange";

}

function roomPlayersList(room) {

  return Array.from(room.players.values()).map(p => ({

    id: p.id,

    name: p.name,

    team: p.team

  }));

}

function send(ws, msg) {

  if (ws.readyState === ws.OPEN) {

    ws.send(JSON.stringify(msg));

  }

}

function sendError(ws, message) {

  send(ws, { type: "error", message });

}

function broadcastState(room, code) {

  for (const [clientWs, info] of room.players.entries()) {

    send(clientWs, {

      type: "state",

      code,

      mode: room.mode,

      max: room.max,

      you: {

        id: info.id,

        team: info.team

      },

      players: roomPlayersList(room)

    });

  }

}

// Sends gameplay messages to every OTHER player in the room.

function broadcastToRoom(room, senderWs, msg) {

  for (const clientWs of room.players.keys()) {

    if (clientWs !== senderWs) {

      send(clientWs, msg);

    }

  }

}

function findOrCreatePublicRoom(mode) {

  for (const [code, room] of rooms.entries()) {

    if (

      !room.isPrivate &&

      room.mode === mode &&

      room.players.size < room.max

    ) {

      return code;

    }

  }

  const code = makeRoomCode();

  rooms.set(code, {

    mode,

    max: maxForMode(mode),

    isPrivate: false,

    players: new Map()

  });

  return code;

}

function addPlayerToRoom(ws, code, name) {

  const room = rooms.get(code);

  if (!room) {

    sendError(ws, "Room no longer exists.");

    return;

  }

  const id = "p" + nextPlayerId++;

  const team = nextTeam(room);

  room.players.set(ws, {

    id,

    name: String(name || "Player").slice(0, 24),

    team

  });

  ws.__roomCode = code;

  broadcastState(room, code);

}

function removePlayer(ws) {

  const code = ws.__roomCode;

  if (!code) return;

  const room = rooms.get(code);

  if (!room) {

    ws.__roomCode = null;

    return;

  }

  room.players.delete(ws);

  ws.__roomCode = null;

  if (room.players.size === 0) {

    rooms.delete(code);

  } else {

    broadcastState(room, code);

  }

}

function handleMessage(ws, raw) {

  let msg;

  try {

    msg = JSON.parse(raw);

  } catch (e) {

    return;

  }

  if (!msg || typeof msg.type !== "string") {

    return;

  }

  // Lobby: public matchmaking

  if (msg.type === "join") {

    const mode = msg.mode === "1v1" ? "1v1" : "2v2";

    const code = findOrCreatePublicRoom(mode);

    addPlayerToRoom(ws, code, msg.name);

    return;

  }

  // Lobby: create private room

  if (msg.type === "create") {

    const mode = msg.mode === "1v1" ? "1v1" : "2v2";

    const code =

      typeof msg.code === "string" && msg.code.trim()

        ? msg.code.trim().toUpperCase()

        : makeRoomCode();

    if (rooms.has(code)) {

      sendError(ws, "That room code is already in use. Try again.");

      return;

    }

    rooms.set(code, {

      mode,

      max: maxForMode(mode),

      isPrivate: true,

      players: new Map()

    });

    addPlayerToRoom(ws, code, msg.name);

    return;

  }

  // Lobby: join private room

  if (msg.type === "joinCode") {

    const code = String(msg.code || "").trim().toUpperCase();

    const room = rooms.get(code);

    if (!room || !room.isPrivate) {

      sendError(ws, "No open room found for code " + code + ".");

      return;

    }

    if (room.players.size >= room.max) {

      sendError(ws, "That room is already full.");

      return;

    }

    addPlayerToRoom(ws, code, msg.name);

    return;

  }

  // Lobby: leave

  if (msg.type === "leave") {

    removePlayer(ws);

    return;

  }

  // Multiplayer gameplay messages

  const gameplayTypes = new Set([

    "start",

    "pos",

    "ball",

    "timer",

    "goal",

    "power",

    "end"

  ]);

  if (gameplayTypes.has(msg.type) && ws.__roomCode) {

    const room = rooms.get(ws.__roomCode);

    if (room) {

      broadcastToRoom(room, ws, msg);

    }

  }

}

// HTTP server for Render

const httpServer = http.createServer((req, res) => {

  res.writeHead(200, {

    "Content-Type": "text/plain"

  });

  res.end("Overdrive multiplayer server is running.\n");

});

// WebSocket server

const wss = new WebSocketServer({

  server: httpServer

});

wss.on("connection", ws => {

  ws.on("message", data => {

    handleMessage(ws, data);

  });

  ws.on("close", () => {

    removePlayer(ws);

  });

  ws.on("error", () => {

    removePlayer(ws);

  });

});

httpServer.listen(PORT, () => {

  console.log(

    `Overdrive multiplayer server listening on port ${PORT}`

  );

});

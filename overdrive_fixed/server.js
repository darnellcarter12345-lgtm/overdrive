const http = require('http');
const path = require('path');
const fs = require('fs');
const express = require('express');
const colyseus = require('colyseus');
const schema = require('@colyseus/schema');

const { Schema, MapSchema } = schema;
const { defineTypes } = schema;

class PlayerState extends Schema {}
defineTypes(PlayerState, {
  name: 'string',
  team: 'string',
  slot: 'number',
  ready: 'boolean',
  x: 'number',
  y: 'number',
  z: 'number',
  yaw: 'number',
  pitch: 'number',
  boost: 'number'
});

class MatchState extends Schema {
  constructor() {
    super();
    this.mode = '2v2';
    this.phase = 'lobby';
    this.started = false;
    this.players = new MapSchema();
  }
}
defineTypes(MatchState, {
  mode: 'string',
  phase: 'string',
  started: 'boolean',
  players: { map: PlayerState }
});

class GridironRoom extends colyseus.Room {
  onCreate(options = {}) {
    const mode = options.mode === '1v1' ? '1v1' : '2v2';
    const maxClients = mode === '1v1' ? 2 : 4;
    this.maxClients = maxClients;
    this.setState(new MatchState());
    this.state.mode = mode;
    this.state.phase = 'lobby';
    this.state.started = false;
    this.code = typeof options.code === 'string' ? options.code.toUpperCase().slice(0, 6) : '';
    if (this.code) {
      this.roomId = this.code;
      this.setPrivate();
    }
    this.setMetadata({ mode, code: this.code || null });

    this.onMessage('startMatch', (client) => {
      if (this.state.players.size < this.maxClients) return;
      if (this.state.started) return;
      this.state.started = true;
      this.state.phase = 'playing';
      this.broadcast('matchStart', { mode: this.state.mode });
    });

    this.onMessage('playerState', (client, data = {}) => {
      const p = this.state.players.get(client.sessionId);
      if (!p || !data) return;
      const num = (v, fallback = 0) => Number.isFinite(Number(v)) ? Number(v) : fallback;
      p.x = num(data.x, p.x);
      p.y = num(data.y, p.y);
      p.z = num(data.z, p.z);
      p.yaw = num(data.yaw, p.yaw);
      p.pitch = num(data.pitch, p.pitch);
      p.boost = Math.max(0, Math.min(100, num(data.boost, p.boost)));
      p.ready = true;
    });
  }

  onJoin(client, options = {}) {
    const slot = this.clients.length - 1;
    const team = this.state.mode === '1v1' ? (slot === 0 ? 'blue' : 'orange') : (slot < 2 ? 'blue' : 'orange');
    const p = new PlayerState();
    p.name = String(options.name || `Player ${slot + 1}`).slice(0, 18);
    p.team = team;
    p.slot = slot;
    p.ready = false;
    p.x = team === 'blue' ? -4 + slot * 2 : 4 - (slot - 2) * 2;
    p.y = 1;
    p.z = team === 'blue' ? -15 : 15;
    p.yaw = team === 'blue' ? 0 : Math.PI;
    p.pitch = 0;
    p.boost = 100;
    this.state.players.set(client.sessionId, p);
    this.broadcast('lobbyUpdate', { count: this.state.players.size, max: this.maxClients });
  }

  onLeave(client) {
    this.state.players.delete(client.sessionId);
    if (this.state.started) {
      this.state.started = false;
      this.state.phase = 'lobby';
      this.broadcast('matchStopped', { reason: 'A player left the match.' });
    }
  }
}

const app = express();
const root = __dirname;
app.get('/healthz', (_req, res) => res.status(200).type('text').send('ok'));
app.use(express.static(root, { index: 'index.html', extensions: ['html'] }));
app.get('*', (req, res) => {
  if (req.path.startsWith('/matchmake/') || req.path.startsWith('/room/')) return res.status(404).end();
  res.sendFile(path.join(root, 'index.html'));
});

const httpServer = http.createServer(app);
const gameServer = new colyseus.Server({ server: httpServer });
gameServer.define('gridiron_public', GridironRoom).filterBy(['mode']);
gameServer.define('gridiron_private', GridironRoom);

gameServer.listen(process.env.PORT || 10000);
console.log(`Overdrive web + multiplayer server listening on ${process.env.PORT || 10000}`);

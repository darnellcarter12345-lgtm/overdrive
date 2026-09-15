const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

const PORT = Number(process.env.PORT) || 10000;
const ROOT = __dirname;
const PUBLIC_FILE = path.join(ROOT, 'index.html');

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.webp': 'image/webp',
  '.mp3': 'audio/mpeg',
  '.wav': 'audio/wav',
  '.mp4': 'video/mp4'
};

const server = http.createServer((req, res) => {
  const pathname = url.parse(req.url).pathname || '/';

  // Render health check.
  if (pathname === '/healthz') {
    res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' });
    res.end('ok');
    return;
  }

  // This project is currently a single-file web app. Serve index.html for
  // the root and for browser history/fallback routes.
  if (pathname === '/') {
    serveFile(PUBLIC_FILE, res);
    return;
  }

  // If a real static asset is added later, serve it from the project root.
  const requested = path.normalize(path.join(ROOT, pathname));
  if (requested.startsWith(ROOT + path.sep) && fs.existsSync(requested) && fs.statSync(requested).isFile()) {
    serveFile(requested, res);
    return;
  }

  // SPA fallback.
  serveFile(PUBLIC_FILE, res);
});

function serveFile(file, res) {
  fs.readFile(file, (err, data) => {
    if (err) {
      console.error(err);
      res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Server error');
      return;
    }
    const ext = path.extname(file).toLowerCase();
    res.writeHead(200, {
      'Content-Type': MIME[ext] || 'application/octet-stream',
      'Cache-Control': 'no-cache'
    });
    res.end(data);
  });
}

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Overdrive server listening on port ${PORT}`);
});

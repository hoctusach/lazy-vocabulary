import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';

const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json',
  '.png': 'image/png', '.ico': 'image/x-icon', '.wav': 'audio/wav', '.csv': 'text/csv', '.svg': 'image/svg+xml',
  '.webmanifest': 'application/manifest+json', '.mp3': 'audio/mpeg' };

/** Tiny static server with SPA fallback, bound to 127.0.0.1 only. */
export function startServer(dir) {
  const server = http.createServer((req, res) => {
    const url = new URL(req.url, 'http://localhost');
    let file = path.join(dir, decodeURIComponent(url.pathname));
    if (!file.startsWith(dir)) { res.writeHead(403); return res.end(); }
    if (!fs.existsSync(file) || fs.statSync(file).isDirectory()) {
      const ext = path.extname(url.pathname);
      if (ext && ext !== '.html') { res.writeHead(404); return res.end('not found'); }
      file = path.join(dir, 'index.html');
    }
    res.writeHead(200, { 'content-type': TYPES[path.extname(file)] || 'application/octet-stream' });
    fs.createReadStream(file).pipe(res);
  });
  return new Promise((resolve) => server.listen(0, '127.0.0.1', () =>
    resolve({ port: server.address().port, close: () => new Promise((r) => server.close(r)) })));
}

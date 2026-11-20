// serve.ts — tiny static server for the Vice Cover app (Node 22+, stdlib only).
// Usage: node serve.ts [--port N]   →  app/ on http://localhost:8080
// Needed because file:// pages block canvas PNG export; the preview itself
// also works straight off file://.

import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { join, normalize, resolve, sep, extname } from 'node:path';
import { fileURLToPath } from 'node:url';

const appRoot = resolve(join(fileURLToPath(new URL('.', import.meta.url)), 'app'));
const portIdx = process.argv.indexOf('--port');
const port = portIdx !== -1 ? Number(process.argv[portIdx + 1]) : 8080;

const MIME: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
  '.ttf': 'font/ttf',
  '.otf': 'font/otf',
  '.bin': 'application/octet-stream',
  '.wasm': 'application/wasm',
  '.wav': 'audio/wav',
  '.mp3': 'audio/mpeg',
  '.ogg': 'audio/ogg',
  '.txt': 'text/plain; charset=utf-8',
};

const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url || '/', 'http://localhost');
    let pathname = decodeURIComponent(url.pathname);
    if (pathname === '/') pathname = '/index.html';
    const abs = resolve(join(appRoot, normalize(pathname)));
    if (abs !== appRoot && !abs.startsWith(appRoot + sep)) {
      res.writeHead(403, { 'content-type': 'text/plain', 'cache-control': 'no-store' });
      res.end('403 Forbidden');
      return;
    }
    const st = await stat(abs).catch(() => null);
    if (!st || !st.isFile()) {
      res.writeHead(404, { 'content-type': 'text/plain', 'cache-control': 'no-store' });
      res.end('404 Not Found');
      return;
    }
    const body = await readFile(abs);
    res.writeHead(200, {
      'content-type': MIME[extname(abs).toLowerCase()] || 'application/octet-stream',
      'content-length': body.length,
      'cache-control': 'no-store',
    });
    res.end(body);
  } catch {
    res.writeHead(500, { 'content-type': 'text/plain', 'cache-control': 'no-store' });
    res.end('500 Internal Server Error');
  }
});

server.listen(port, '127.0.0.1', () => {
  console.log(`app/ is on http://localhost:${port}`);
});

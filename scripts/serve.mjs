import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root = fileURLToPath(new URL('../dist/', import.meta.url));
const types = {'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.ttf':'font/ttf','.svg':'image/svg+xml','.png':'image/png','.ico':'image/x-icon','.txt':'text/plain; charset=utf-8'};
const server = http.createServer(async (req,res) => {
  try {
    const pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
    const filename = path.resolve(root, `.${pathname === '/' ? '/index.html' : pathname}`);
    if (!filename.startsWith(root)) {res.writeHead(403);res.end('Forbidden');return;}
    const content = await fs.readFile(filename);
    res.writeHead(200, {'Content-Type':types[path.extname(filename)] || 'application/octet-stream','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(content);
  } catch {res.writeHead(404);res.end('Not found');}
});
server.listen(4173, '127.0.0.1', () => console.log('AETHRIVA Local: http://127.0.0.1:4173'));

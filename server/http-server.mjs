import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {readWorkspace, WorkspaceError} from './local-workspace.mjs';

const defaultRoot = fileURLToPath(new URL('../dist/', import.meta.url));
const types = {'.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.ttf': 'font/ttf', '.svg': 'image/svg+xml', '.png': 'image/png', '.ico': 'image/x-icon', '.txt': 'text/plain; charset=utf-8'};
const securityHeaders = {
  'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'no-referrer',
  'X-Frame-Options': 'DENY', 'Cross-Origin-Resource-Policy': 'same-origin', 'Cross-Origin-Opener-Policy': 'same-origin',
  'Content-Security-Policy': "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; connect-src 'self'; img-src 'self' data:; font-src 'self'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'",
};
function json(res, status, value, extra = {}) { res.writeHead(status, {'Content-Type': 'application/json; charset=utf-8', ...extra}); res.end(JSON.stringify(value)); }
function failure(res, status, code, message, extra) { return json(res, status, {error: {code, message}}, extra); }

/** This server only reads local data. It never forwards credentials or starts a sync. */
export function createLocalServer({databasePath, accountId, staticRoot = defaultRoot, port = 4173, now = () => new Date()} = {}) {
  const allowedHosts = new Set([`127.0.0.1:${port}`, `localhost:${port}`]);
  const root = path.resolve(staticRoot);
  return http.createServer(async (req, res) => {
    for (const [name, value] of Object.entries(securityHeaders)) res.setHeader(name, value);
    try {
      const host = req.headers.host;
      if (!allowedHosts.has(host)) return failure(res, 403, 'INVALID_HOST', 'This workspace is available only on its local address.');
      if (req.headers.origin && req.headers.origin !== `http://${host}`) return failure(res, 403, 'INVALID_ORIGIN', 'Cross-origin requests are not allowed.');
      if (!req.url?.startsWith('/') || req.url.startsWith('//')) return failure(res, 400, 'INVALID_REQUEST', 'The request is invalid.');
      let pathname;
      try { pathname = decodeURIComponent(req.url.split('?')[0]); } catch { return failure(res, 400, 'INVALID_REQUEST', 'The request path is invalid.'); }
      if (pathname.includes('\0') || pathname.includes('\\') || pathname.split('/').includes('..')) return failure(res, 403, 'INVALID_PATH', 'This file is not available.');
      if (pathname.startsWith('/api/')) {
        if (req.headers['sec-fetch-site'] && !['same-origin', 'none'].includes(req.headers['sec-fetch-site'])) return failure(res, 403, 'CROSS_SITE_REQUEST', 'Cross-site requests are not allowed.');
        if (req.method !== 'GET') return failure(res, 405, 'READ_ONLY', 'This workspace only supports reading saved data.', {Allow: 'GET'});
        if (pathname !== '/api/workspace') return failure(res, 404, 'NOT_FOUND', 'This endpoint is not available.');
        return json(res, 200, readWorkspace({databasePath, accountId, now: now()}));
      }
      if (!['GET', 'HEAD'].includes(req.method)) return failure(res, 405, 'READ_ONLY', 'This workspace only supports reading files.', {Allow: 'GET, HEAD'});
      const filename = path.resolve(root, `.${pathname === '/' ? '/index.html' : pathname}`);
      if (!filename.startsWith(`${root}${path.sep}`)) return failure(res, 403, 'INVALID_PATH', 'This file is not available.');
      let resolved, rootResolved;
      try { [resolved, rootResolved] = await Promise.all([fs.realpath(filename), fs.realpath(root)]); }
      catch { return failure(res, 404, 'NOT_FOUND', 'This file is not available.'); }
      if (!resolved.startsWith(`${rootResolved}${path.sep}`)) return failure(res, 403, 'INVALID_PATH', 'This file is not available.');
      const type = types[path.extname(resolved)];
      if (!type) return failure(res, 404, 'NOT_FOUND', 'This file is not available.');
      const content = await fs.readFile(resolved);
      res.writeHead(200, {'Content-Type': type, 'Content-Length': content.length});
      res.end(req.method === 'HEAD' ? undefined : content);
    } catch (error) {
      if (error instanceof WorkspaceError) return failure(res, error.status, error.code, error.message);
      return failure(res, 500, 'REQUEST_FAILED', 'The local workspace could not complete this request.');
    }
  });
}

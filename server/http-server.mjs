import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {WorkspaceError} from './local-workspace.mjs';
import {readCombinedWorkspace,readOperationalStatus,saveCheckin,saveDeviceReadings} from './local-journal.mjs';
import {validateWorkspace} from '../dist/data/workspace-data.js';

const defaultRoot = fileURLToPath(new URL('../dist/', import.meta.url));
const types = {'.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.ttf': 'font/ttf', '.woff2':'font/woff2', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg':'image/jpeg', '.jpeg':'image/jpeg', '.webp':'image/webp', '.ico': 'image/x-icon', '.txt': 'text/plain; charset=utf-8'};
const securityHeaders = {
  'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'no-referrer',
  'X-Frame-Options': 'DENY', 'Cross-Origin-Resource-Policy': 'same-origin', 'Cross-Origin-Opener-Policy': 'same-origin',
  'Content-Security-Policy': "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; connect-src 'self'; img-src 'self' data:; font-src 'self'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'",
};
function json(res, status, value, extra = {}) { res.writeHead(status, {'Content-Type': 'application/json; charset=utf-8', ...extra}); res.end(JSON.stringify(value)); }
function failure(res, status, code, message, extra) { return json(res, status, {error: {code, message}}, extra); }

const MAX_BODY_BYTES=256*1024;
function readJsonBody(req) {
  return new Promise((resolve,reject)=>{
    let size=0,done=false;const chunks=[];
    const finish=(error,value)=>{if(done)return;done=true;clearTimeout(timer);req.removeListener('data',onData);req.removeListener('end',onEnd);req.removeListener('error',onError);req.removeListener('aborted',onAborted);if(error){req.resume();reject(error);}else resolve(value);};
    const onError=()=>finish(new WorkspaceError('INVALID_BODY','The request body could not be read.',400));
    const onAborted=()=>finish(new WorkspaceError('INVALID_BODY','The request body was interrupted.',400));
    const onData=chunk=>{size+=chunk.length;if(size>MAX_BODY_BYTES)finish(new WorkspaceError('BODY_TOO_LARGE','The request body exceeds 256 KB.',413));else chunks.push(chunk);};
    const onEnd=()=>{try{finish(null,JSON.parse(Buffer.concat(chunks).toString('utf8')));}catch{finish(new WorkspaceError('INVALID_JSON','Provide a valid JSON request body.',400));}};
    const timer=setTimeout(()=>finish(new WorkspaceError('BODY_TIMEOUT','The request body took too long to arrive.',408)),5000);timer.unref();
    if(Number(req.headers['content-length'])>MAX_BODY_BYTES){finish(new WorkspaceError('BODY_TOO_LARGE','The request body exceeds 256 KB.',413));return;}
    req.on('data',onData);req.on('end',onEnd);req.on('error',onError);req.on('aborted',onAborted);
  });
}

/** Provider history remains read-only. Mutations write only AETHRIVA's separate local journal. */
export function createLocalServer({databasePath, accountId, journalPath, staticRoot = defaultRoot, port = 4173, now = () => new Date()} = {}) {
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
        const options={databasePath,accountId,journalPath,now:now()};
        if(pathname==='/api/workspace'||pathname==='/api/status'){
          if(req.method!=='GET')return failure(res,405,'METHOD_NOT_ALLOWED','This endpoint supports reading only.',{Allow:'GET'});
          return json(res,200,pathname==='/api/status'?readOperationalStatus(options):readCombinedWorkspace(options));
        }
        if(pathname==='/api/checkins'||pathname==='/api/device-readings'){
          if(req.method!=='POST')return failure(res,405,'METHOD_NOT_ALLOWED','This endpoint supports saving with POST.',{Allow:'POST'});
          if(req.headers.origin!==`http://${host}`)return failure(res,403,'ORIGIN_REQUIRED','Saving requires the exact local workspace origin.');
          if(!/^application\/json(?:\s*;\s*charset=utf-8)?$/i.test(req.headers['content-type']||''))return failure(res,415,'JSON_REQUIRED','Saving requires Content-Type: application/json.');
          const body=await readJsonBody(req);
          // Validate the readable snapshot before committing a write. A preexisting
          // damaged journal must not produce a failed response after a successful save.
          validateWorkspace(readCombinedWorkspace(options));
          const result=pathname==='/api/checkins'?{checkin:saveCheckin(body,options)}:saveDeviceReadings(body,options);
          return json(res,201,{...result,workspace:readCombinedWorkspace(options)});
        }
        return failure(res, 404, 'NOT_FOUND', 'This endpoint is not available.');
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

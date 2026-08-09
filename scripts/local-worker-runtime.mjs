#!/usr/bin/env node
import http from 'node:http';

const WORKER_NAME_PATTERN = /^[a-zA-Z0-9_-]+$/;
const ALLOWED_PATHS = /^\/(health|ready|metrics)$/;

function sanitizeWorkerName(raw: string): string {
  return raw.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 80) || 'worker';
}

const port = Number(process.env.PORT ?? 8080);
const rawWorkerName = process.argv[2] ?? process.env.WASEL_WORKER_NAME ?? 'worker';
const workerName = sanitizeWorkerName(rawWorkerName);
const startedAt = Date.now();

const ALLOWED_LOCAL_PATHS = ['/health', '/ready', '/metrics'];

function isValidLocalUrl(url) {
  try {
    const parsed = new URL(url, 'http://localhost');
    return ALLOWED_LOCAL_PATHS.includes(parsed.pathname);
  } catch {
    return false;
  }
}

function send(response, statusCode, contentType, body) {
  response.writeHead(statusCode, { 'content-type': contentType });
  response.end(body);
}

const server = http.createServer((request, response) => {
   if (!isValidLocalUrl(request.url ?? '/')) {
     send(response, 403, 'application/json', JSON.stringify({ error: 'Forbidden' }));
     return;
   }

   if (request.url === '/health' || request.url === '/ready') {
     send(
       response,
       200,
       'application/json',
       JSON.stringify({
         status: 'ok',
         service: 'wasel-worker',
         worker: workerName,
         uptimeSeconds: Math.round((Date.now() - startedAt) / 1000),
       }),
     );
     return;
   }

   if (request.url === '/metrics') {
     send(
       response,
       200,
       'text/plain; version=0.0.4',
       `wasel_worker_runtime_up{worker="${workerName}"} 1\n`,
     );
     return;
   }

   send(response, 200, 'text/plain; charset=utf-8', `Wasel ${workerName} runtime\n`);
});

server.listen(port, () => {
  console.log(`[wasel-${workerName}] local production proof runtime listening on ${port}`);
});

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => {
    server.close(() => process.exit(0));
  });
}

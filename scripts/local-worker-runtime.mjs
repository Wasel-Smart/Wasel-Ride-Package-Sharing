#!/usr/bin/env node
import http from 'node:http';

const port = Number(process.env.PORT ?? 8080);
const workerName = process.argv[2] ?? process.env.WASEL_WORKER_NAME ?? 'worker';
const startedAt = Date.now();

function send(response, statusCode, contentType, body) {
  response.writeHead(statusCode, { 'content-type': contentType });
  response.end(body);
}

const server = http.createServer((request, response) => {
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

import * as http from 'http';

function sendJson(
  response: http.ServerResponse,
  statusCode: number,
  payload: Record<string, unknown>,
): void {
  response.writeHead(statusCode, { 'content-type': 'application/json' });
  response.end(JSON.stringify(payload));
}

export interface RuntimeHealthServerOptions {
  serviceName: string;
  port?: number;
  isReady: () => boolean | Promise<boolean>;
  isHealthy: () => boolean | Promise<boolean>;
  metrics?: () => string | Promise<string>;
}

export interface RuntimeHealthServer {
  close: () => Promise<void>;
}

export function startRuntimeHealthServer(
  options: RuntimeHealthServerOptions,
): RuntimeHealthServer {
  const port = options.port ?? Number(process.env.PORT ?? 8080);
  const startedAt = Date.now();

  const server = http.createServer(async (request, response) => {
    try {
      if (request.url === '/health') {
        const healthy = await options.isHealthy();
        sendJson(response, healthy ? 200 : 503, {
          service: options.serviceName,
          status: healthy ? 'healthy' : 'unhealthy',
          uptimeSeconds: Math.round((Date.now() - startedAt) / 1000),
        });
        return;
      }
      if (request.url === '/ready') {
        const ready = await options.isReady();
        sendJson(response, ready ? 200 : 503, {
          service: options.serviceName,
          status: ready ? 'ready' : 'not_ready',
        });
        return;
      }
      if (request.url === '/metrics') {
        response.writeHead(200, { 'content-type': 'text/plain; version=0.0.4' });
        response.end(
          options.metrics
            ? await options.metrics()
            : `wasel_service_uptime_seconds{service="${options.serviceName}"} ${Math.round((Date.now() - startedAt) / 1000)}\n`,
        );
        return;
      }
      sendJson(response, 404, { error: 'not_found' });
    } catch (error) {
      sendJson(response, 500, {
        service: options.serviceName,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  });

  server.listen(port, () => {
    console.log(`[${options.serviceName}] Runtime HTTP server listening on ${port}`);
  });

  return {
    close: () =>
      new Promise<void>((resolve, reject) => {
        server.close(error => {
          if (error) {
            reject(error);
            return;
          }
          resolve();
        });
      }),
  };
}
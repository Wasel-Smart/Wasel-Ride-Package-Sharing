/**
 * Wasel Supabase Edge Function entrypoint.
 *
 * This source is intentionally tracked with the frontend so API routes used by
 * `src/services/*` are auditable and versioned. Production handlers should keep
 * privileged Supabase service-role operations in this server boundary only.
 */

type RouteHandler = (request: Request, params: Record<string, string>) => Promise<Response> | Response;

type Route = {
  method: string;
  pattern: RegExp;
  params?: string[];
  handler: RouteHandler;
};

const jsonHeaders = {
  'Access-Control-Allow-Headers': 'authorization, content-type, x-wasel-request-id, x-wasel-signature',
  'Access-Control-Allow-Methods': 'GET,POST,PUT,PATCH,DELETE,OPTIONS',
  'Access-Control-Allow-Origin': '*',
  'Content-Type': 'application/json',
};

function json(status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), { headers: jsonHeaders, status });
}

function notImplemented(route: string): Response {
  return json(501, {
    error: `${route} is declared but not implemented in this tracked Edge Function source yet.`,
    route,
    status: 'not_implemented',
  });
}

function requireJwt(request: Request): Response | null {
  const authorization = request.headers.get('authorization') ?? '';
  if (!authorization.toLowerCase().startsWith('bearer ')) {
    return json(401, { error: 'Missing bearer token.' });
  }
  return null;
}

const routes: Route[] = [
  {
    method: 'GET',
    pattern: /^\/health$/,
    handler: () => json(200, { ok: true, service: 'wasel-edge', version: 'tracked-v1' }),
  },
  {
    method: 'POST',
    pattern: /^\/profile$/,
    handler: (request) => requireJwt(request) ?? notImplemented('POST /profile'),
  },
  {
    method: 'GET',
    pattern: /^\/profile\/([^/]+)$/,
    params: ['userId'],
    handler: (request) => requireJwt(request) ?? notImplemented('GET /profile/{userId}'),
  },
  {
    method: 'PATCH',
    pattern: /^\/profile\/([^/]+)$/,
    params: ['userId'],
    handler: (request) => requireJwt(request) ?? notImplemented('PATCH /profile/{userId}'),
  },
  {
    method: 'GET',
    pattern: /^\/wallet$/,
    handler: (request) => requireJwt(request) ?? notImplemented('GET /wallet'),
  },

  {
    method: 'POST',
    pattern: /^\/wallet\/withdraw$/,
    handler: (request) => requireJwt(request) ?? notImplemented('POST /wallet/withdraw'),
  },
  {
    method: 'POST',
    pattern: /^\/wallet\/transfer$/,
    handler: (request) => requireJwt(request) ?? notImplemented('POST /wallet/transfer'),
  },
  {
    method: 'POST',
    pattern: /^\/wallet\/payment-methods$/,
    handler: (request) => requireJwt(request) ?? notImplemented('POST /wallet/payment-methods'),
  },
  {
    method: 'POST',
    pattern: /^\/wallet\/set-pin$/,
    handler: (request) => requireJwt(request) ?? notImplemented('POST /wallet/set-pin'),
  },
  {
    method: 'POST',
    pattern: /^\/wallet\/verify-pin$/,
    handler: (request) => requireJwt(request) ?? notImplemented('POST /wallet/verify-pin'),
  },
  {
    method: 'POST',
    pattern: /^\/wallet\/settings$/,
    handler: (request) => requireJwt(request) ?? notImplemented('POST /wallet/settings'),
  },
  {
    method: 'POST',
    pattern: /^\/payments\/create-intent$/,
    handler: (request) => requireJwt(request) ?? notImplemented('POST /payments/create-intent'),
  },
  {
    method: 'POST',
    pattern: /^\/payments\/confirm$/,
    handler: (request) => requireJwt(request) ?? notImplemented('POST /payments/confirm'),
  },
  {
    method: 'POST',
    pattern: /^\/payments\/status$/,
    handler: (request) => requireJwt(request) ?? notImplemented('POST /payments/status'),
  },
  {
    method: 'GET',
    pattern: /^\/admin\/drivers\/pending$/,
    handler: (request) => requireJwt(request) ?? notImplemented('GET /admin/drivers/pending'),
  },
  {
    method: 'POST',
    pattern: /^\/admin\/drivers\/([^/]+)\/approve$/,
    params: ['driverId'],
    handler: (request) => requireJwt(request) ?? notImplemented('POST /admin/drivers/{driverId}/approve'),
  },
  {
    method: 'GET',
    pattern: /^\/safety\/settings$/,
    handler: (request) => requireJwt(request) ?? notImplemented('GET /safety/settings'),
  },
  {
    method: 'PUT',
    pattern: /^\/safety\/settings$/,
    handler: (request) => requireJwt(request) ?? notImplemented('PUT /safety/settings'),
  },
  {
    method: 'POST',
    pattern: /^\/safety\/incident$/,
    handler: (request) => requireJwt(request) ?? notImplemented('POST /safety/incident'),
  },
  {
    method: 'POST',
    pattern: /^\/safety\/sos$/,
    handler: (request) => requireJwt(request) ?? notImplemented('POST /safety/sos'),
  },
  {
    method: 'GET',
    pattern: /^\/user-settings$/,
    handler: (request) => requireJwt(request) ?? notImplemented('GET /user-settings'),
  },
  {
    method: 'PUT',
    pattern: /^\/user-settings$/,
    handler: (request) => requireJwt(request) ?? notImplemented('PUT /user-settings'),
  },
];

function matchRoute(method: string, pathname: string) {
  for (const route of routes) {
    if (route.method !== method) continue;
    const match = pathname.match(route.pattern);
    if (!match) continue;
    const params = Object.fromEntries((route.params ?? []).map((key, index) => [key, match[index + 1] ?? '']));
    return { params, route };
  }
  return null;
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') {
    return new Response(null, { headers: jsonHeaders, status: 204 });
  }

  const url = new URL(request.url);
  const matched = matchRoute(request.method, url.pathname);
  if (!matched) {
    return json(404, { error: 'Route not found.', path: url.pathname });
  }

  try {
    return await matched.route.handler(request, matched.params);
  } catch (error) {
    return json(500, {
      error: error instanceof Error ? error.message : 'Unexpected Edge Function error.',
    });
  }
});

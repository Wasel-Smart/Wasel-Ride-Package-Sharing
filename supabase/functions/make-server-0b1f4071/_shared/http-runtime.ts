export interface RouteDefinition {
  method: 'GET' | 'POST' | 'PATCH';
  path: string;
  handler: (request: Request) => Promise<Response> | Response;
}

export function jsonResponse(
  data: unknown,
  corsHeaders: Record<string, string>,
  status = 200,
) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json',
    },
  });
}

export function noContentResponse(
  corsHeaders: Record<string, string>,
  status = 204,
) {
  return new Response(null, {
    status,
    headers: corsHeaders,
  });
}

export async function dispatchRouteRequest(options: {
  corsHeaders: Record<string, string>;
  request: Request;
  basePathPattern: RegExp;
  routes: RouteDefinition[];
}) {
  if (options.request.method === 'OPTIONS') {
    return noContentResponse(options.corsHeaders);
  }

  const url = new URL(options.request.url);
  const normalizedPath = url.pathname.replace(options.basePathPattern, '') || '/';

  const matchedRoute = options.routes.find(
    (route) =>
      route.method === options.request.method &&
      route.path === normalizedPath,
  );

  if (!matchedRoute) {
    return jsonResponse(
      { error: 'Route not found', path: normalizedPath },
      options.corsHeaders,
      404,
    );
  }

  try {
    return await matchedRoute.handler(options.request);
  } catch (error) {
    return jsonResponse(
      { error: error instanceof Error ? error.message : String(error) },
      options.corsHeaders,
      500,
    );
  }
}

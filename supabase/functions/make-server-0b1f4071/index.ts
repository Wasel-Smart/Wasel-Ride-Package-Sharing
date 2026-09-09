



const ROUTES = [];



Deno.serve(async (request: Request) => {
  let response: Response | undefined;
  if (!isOriginAllowed(request)) {
    response = json({ error: 'Origin not allowed' }, 403);
    return finalizeResponse(request, response);
  }
  if (request.method === 'OPTIONS') {
    response = noContent();
    return finalizeResponse(request, response);
  }
  try {
    const url = new URL(request.url);
    const path = url.pathname.replace(/^.*make-server-0b1f4071/, '') || '/';
    if (request.method === 'GET' && path === '/health') {
      response = await handleHealth(request);
      return finalizeResponse(request, response);
    }
    response = await resolveRoute(request);
  } catch (error) {
    logUnhandledRouteError(error, request);
    response = sanitizedUnhandledErrorResponse();
  }
  return finalizeResponse(request, response ?? json({ error: 'Route not found' }, 404));
});

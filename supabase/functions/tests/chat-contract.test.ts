import { assertEquals, assertStringIncludes } from 'https://deno.land/std@0.224.0/assert/mod.ts';

Deno.env.set('SUPABASE_URL', 'https://example.supabase.co');
Deno.env.set('SUPABASE_SERVICE_ROLE_KEY', 'test-service-role-key');
Deno.env.set('SUPABASE_ANON_KEY', 'test-anon-key');

const { handleGetChatMessages, handleSendChatMessage } = await import('../make-server-0b1f4071/_handlers/chat.ts');
const originalFetch = globalThis.fetch;
const authId = '11111111-1111-4111-8111-111111111111';
const tripId = '22222222-2222-4222-8222-222222222222';
const conversationId = '33333333-3333-4333-8333-333333333333';
const messageId = '44444444-4444-4444-8444-444444444444';

function request(method = 'GET', body?: unknown) {
  return new Request(`https://edge.test/chat/trips/${tripId}/messages`, {
    method,
    headers: { Authorization: 'Bearer test-token', ...(body ? { 'Content-Type': 'application/json' } : {}) },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
}

function installFetch() {
  const calls: Array<{ url: URL; method: string; body: string }> = [];
  globalThis.fetch = async (input, init) => {
    const url = new URL(input instanceof Request ? input.url : String(input));
    const method = init?.method ?? 'GET';
    const body = typeof init?.body === 'string' ? init.body : '';
    calls.push({ url, method, body });
    if (url.pathname === '/auth/v1/user') {return Response.json({ id: authId, email: 'rider@example.test' });}
    if (url.pathname === '/rest/v1/users') {return Response.json({
      id: authId, auth_user_id: authId, email: 'rider@example.test', full_name: 'Test Rider', role: 'passenger',
    });}
    if (url.pathname === '/rest/v1/trips') {return Response.json({ id: tripId, trip_id: tripId, driver_id: authId });}
    if (url.pathname === '/rest/v1/drivers') {return Response.json({ id: authId, driver_id: authId, user_id: authId });}
    if (url.pathname === '/rest/v1/bookings') {return Response.json(null);}
    if (url.pathname === '/rest/v1/conversations' && method === 'GET') {return Response.json({ conversation_id: conversationId });}
    if (url.pathname === '/rest/v1/conversation_members' && method === 'GET') {return Response.json({ last_read_at: null });}
    if (url.pathname === '/rest/v1/conversation_members') {return new Response(null, { status: 204 });}
    if (url.pathname === '/rest/v1/messages' && method === 'GET') {return Response.json([{
      message_id: messageId, conversation_id: conversationId, user_id: authId, content: 'Hello',
      type: 'text', metadata: {}, created_at: '2026-11-08T00:00:00.000Z',
      sender: { id: authId, auth_user_id: authId, full_name: 'Test Rider', avatar_url: null },
    }]);}
    if (url.pathname === '/rest/v1/messages' && method === 'POST') {return Response.json({
      message_id: messageId, conversation_id: conversationId, user_id: authId, content: 'Hello',
      type: 'text', metadata: {}, created_at: '2026-11-08T00:00:00.000Z',
      sender: { id: authId, auth_user_id: authId, full_name: 'Test Rider', avatar_url: null },
    });}
    return new Response(`unexpected request: ${method} ${url.pathname}`, { status: 500 });
  };
  return calls;
}

Deno.test('chat history uses deployed message identifiers and maps the mobile/web contract', async () => {
  const calls = installFetch();
  try {
    const response = await handleGetChatMessages(request(), `/chat/trips/${tripId}/messages`);
    assertEquals(response.status, 200);
    const result = await response.json();
    assertEquals(result.conversationId, conversationId);
    assertEquals(result.messages[0].id, messageId);
    assertEquals(result.messages[0].trip_id, tripId);
    assertEquals(result.messages[0].sender_id, authId);
    const messageQuery = calls.find(call => call.url.pathname === '/rest/v1/messages' && call.method === 'GET');
    assertStringIncludes(messageQuery?.url.searchParams.get('select') ?? '', 'message_id');
    assertStringIncludes(messageQuery?.url.searchParams.get('select') ?? '', 'conversation_id');
  } finally {
    globalThis.fetch = originalFetch;
  }
});

Deno.test('chat rejects oversized content before writing to the database', async () => {
  const calls = installFetch();
  try {
    const response = await handleSendChatMessage(request('POST', { content: 'x'.repeat(4001) }), `/chat/trips/${tripId}/messages`);
    assertEquals(response.status, 400);
    assertEquals(calls.some(call => call.url.pathname === '/rest/v1/messages' && call.method === 'POST'), false);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

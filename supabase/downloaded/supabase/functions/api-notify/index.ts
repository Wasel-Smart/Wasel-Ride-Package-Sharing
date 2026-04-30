const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const PUSH_PROVIDER_URL = Deno.env.get("PUSH_PROVIDER_URL") || "";
const PUSH_PROVIDER_KEY = Deno.env.get("PUSH_PROVIDER_KEY") || "";

interface NotifyPayload {
  user_id: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
  send_push?: boolean;
}

Deno.serve(async (req: Request) => {
  try {
    if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });

    const payload: NotifyPayload = await req.json();
    if (!payload.user_id || !payload.title || !payload.body) {
      return new Response("Missing fields", { status: 400 });
    }

    const insertRes = await fetch(`${SUPABASE_URL}/rest/v1/notifications`, {
      method: "POST",
      headers: {
        "apikey": SUPABASE_SERVICE_ROLE_KEY,
        "Authorization": `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        "Content-Type": "application/json",
        "Prefer": "return=representation"
      },
      body: JSON.stringify({
        user_id: payload.user_id,
        type: "push",
        title: payload.title,
        body: payload.body,
        data: payload.data || {},
        created_at: new Date().toISOString()
      })
    });

    const created = await insertRes.json().catch(() => null);

    if (payload.send_push && PUSH_PROVIDER_URL) {
      const pushPromise = fetch(PUSH_PROVIDER_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${PUSH_PROVIDER_KEY}`
        },
        body: JSON.stringify({
          to_user_id: payload.user_id,
          title: payload.title,
          body: payload.body,
          data: payload.data || {}
        })
      }).then(r => r.text()).catch(err => console.error("push error", err));

      (globalThis as any).EdgeRuntime?.waitUntil?.(pushPromise);
    }

    return new Response(JSON.stringify({ success: true, created }), { status: 200, headers: { "Content-Type": "application/json" }});
  } catch (err) {
    console.error("notify error", err);
    return new Response("Internal error", { status: 500 });
  }
});

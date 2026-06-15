// wasel-stripe-payments
// Minimal Stripe PaymentIntent creator using fetch and Deno.serve
// Expects: POST JSON { amount: number (cents), currency?: string, metadata?: object, receipt_email?: string, customer?: string }
// Environment: STRIPE_SECRET_KEY must be set in Supabase secrets

Deno.serve(async (req: Request) => {
  try {
    if (req.method !== "POST") {
      return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405, headers: { "Content-Type": "application/json" } });
    }

    const contentType = req.headers.get("content-type") || "";
    if (!contentType.includes("application/json")) {
      return new Response(JSON.stringify({ error: "Expected application/json" }), { status: 400, headers: { "Content-Type": "application/json" } });
    }

    const body = await req.json().catch(() => null);
    if (!body || typeof body.amount !== "number" || body.amount <= 0) {
      return new Response(JSON.stringify({ error: "Invalid request body. Provide { amount: number } in cents." }), { status: 400, headers: { "Content-Type": "application/json" } });
    }

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) {
      console.error("Missing STRIPE_SECRET_KEY env var");
      return new Response(JSON.stringify({ error: "Server misconfiguration" }), { status: 500, headers: { "Content-Type": "application/json" } });
    }

    const currency = typeof body.currency === "string" ? body.currency : "usd";
    const metadata = (body.metadata && typeof body.metadata === "object") ? body.metadata : undefined;

    const params = new URLSearchParams();
    params.append("amount", String(body.amount));
    params.append("currency", currency);
    if (body.receipt_email && typeof body.receipt_email === "string") params.append("receipt_email", body.receipt_email);
    if (body.customer && typeof body.customer === "string") params.append("customer", body.customer);
    if (metadata) {
      for (const [k, v] of Object.entries(metadata)) {
        params.append(`metadata[${k}]`, String(v));
      }
    }

    const resp = await fetch("https://api.stripe.com/v1/payment_intents", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${stripeKey}`,
        "Content-Type": "application/x-www-form-urlencoded"
      },
      body: params.toString()
    });

    const stripeResult = await resp.text();
    let parsed;
    try { parsed = JSON.parse(stripeResult); } catch { parsed = { raw: stripeResult }; }

    return new Response(JSON.stringify(parsed), {
      status: resp.status,
      headers: { "Content-Type": "application/json", "Connection": "keep-alive" }
    });
  } catch (err) {
    console.error("wasel-stripe-payments error:", err);
    return new Response(JSON.stringify({ error: "Internal server error" }), { status: 500, headers: { "Content-Type": "application/json" } });
  }
});
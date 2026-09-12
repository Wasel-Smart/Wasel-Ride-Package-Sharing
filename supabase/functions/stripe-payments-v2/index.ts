
import Stripe from "npm:stripe@12.12.0";
import { createClient } from "npm:@supabase/supabase-js@2.36.0";
import { createRateLimitMiddleware } from "../_shared/rate-limiter.ts";

const STRIPE_SECRET = Deno.env.get("STRIPE_SECRET_KEY") ?? "";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const APP_ORIGIN = Deno.env.get("APP_ORIGIN") ??
  Deno.env.get("PUBLIC_SITE_URL") ?? "";
const ALLOWED_ORIGINS = (Deno.env.get("ALLOWED_ORIGINS") ?? "https://wasel14.online,https://www.wasel14.online")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

if (!STRIPE_SECRET) throw new Error("Missing STRIPE_SECRET_KEY");
// Supabase persistence is optional; payments are still processed without it.

const stripe = new Stripe(STRIPE_SECRET, { apiVersion: "2024-11-20" });
const supabase = SUPABASE_URL && SUPABASE_KEY
  ? createClient(SUPABASE_URL, SUPABASE_KEY)
  : null;
const paymentRateLimit = createRateLimitMiddleware(
  { windowMs: 60_000, maxRequests: 30 },
);
const ALLOWED_CURRENCIES = new Set(["jod", "usd"]);
const MAX_PAYMENT_AMOUNT_MINOR = 500_000;
const IDEMPOTENCY_KEY_PATTERN = /^[A-Za-z0-9_-]{1,128}$/;
const ALLOWED_PAYMENT_PURPOSES = new Set(['wallet_top_up', 'ride_payment', 'package_payment']);
const WASEL_PLUS_PRICE_ID = Deno.env.get('STRIPE_WASEL_PLUS_PRICE_ID') ?? '';

function getCorsHeaders(request: Request): Record<string, string> {
  const origin = request.headers.get("origin");
  const headers: Record<string, string> = {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff",
  };
  if (origin && ALLOWED_ORIGINS.includes(origin)) {
    headers["Access-Control-Allow-Origin"] = origin;
    headers["Access-Control-Allow-Credentials"] = "true";
    headers["Vary"] = "Origin";
  }
  return headers;
}

function jsonResponse(
  body: Record<string, unknown>,
  init: ResponseInit = {},
  request?: Request,
): Response {
  const corsHeaders = request ? getCorsHeaders(request) : {};
  return new Response(JSON.stringify(body), {
    ...init,
    headers: {
      ...corsHeaders,
      ...(init.headers ?? {}),
    },
  });
}

function isAllowedRedirectUrl(value: unknown): value is string {
  if (typeof value !== "string" || !value.trim()) return false;

  try {
    const url = new URL(value);
    if (url.protocol !== "https:") return false;
    // Redirect URLs are a security boundary. Missing configuration must never
    // widen the policy to every HTTPS site.
    if (!APP_ORIGIN) return false;
    return url.origin === new URL(APP_ORIGIN).origin;
  } catch {
    return false;
  }
}

function normalizeAmount(value: unknown): number | null {
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  const amount = Math.round(value);
  if (amount < 50 || amount > MAX_PAYMENT_AMOUNT_MINOR) return null;
  return amount;
}

const OUTBOX_TABLE = "event_outbox";

async function requireAuthenticatedUser(
  req: Request,
): Promise<{ id: string } | Response> {
  const authHeader = req.headers.get("authorization") || "";
  const token = authHeader.startsWith("Bearer ")
    ? authHeader.slice(7).trim()
    : "";

  if (!token) return jsonResponse({ error: "Unauthorized" }, { status: 401 });

  if (!supabase) {
    return jsonResponse(
      { error: "Authentication service unavailable" },
      { status: 500 },
    );
  }

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser(token);

  if (error || !user) {
    return jsonResponse({ error: "Invalid auth token" }, { status: 401 });
  }

  return { id: user.id };
}

async function publishEvent(
  admin: ReturnType<typeof getAdminClient>,
  event: Record<string, unknown>,
) {
  try {
    await admin.from(OUTBOX_TABLE).insert({
      id: event.id as string,
      topic: event.topic as string,
      payload: event.payload as never,
      producer: event.producer as string,
      trace_id: event.trace_id as string,
      status: "pending",
      attempts: 0,
      created_at: event.occurred_at as string,
    });
  } catch {
    // outbox publish failure is non-fatal
  }
}

function makeId(prefix: string): string {
  return `${prefix}-${crypto.randomUUID()}`;
}

function getAdminClient() {
  return createClient(SUPABASE_URL, SUPABASE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    const origin = req.headers.get("origin");
    const allowedOrigins = (Deno.env.get("ALLOWED_ORIGINS") ?? "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    const headers: Record<string, string> = {
      "Content-Type": "application/json; charset=utf-8",
      "X-Content-Type-Options": "nosniff",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers":
        "authorization, apikey, content-type, x-client-info, x-supabase-client, x-supabase-session",
      "Access-Control-Max-Age": "86400",
    };

    if (origin && (allowedOrigins.includes(origin) || allowedOrigins.includes("*"))) {
      headers["Access-Control-Allow-Origin"] = origin;
      headers["Access-Control-Allow-Credentials"] = "true";
      headers["Vary"] = "Origin";
    }

    return new Response(null, { status: 204, headers });
  }

  const rateLimitResponse = paymentRateLimit(req);
  if (rateLimitResponse) return rateLimitResponse;

  try {
    const url = new URL(req.url);
    const pathname = url.pathname.replace(/\/+$/, "");

    if ((pathname.endsWith("/create-payment-intent") || pathname.endsWith("/stripe-payments-v2")) && req.method === "POST") {
      const auth = await requireAuthenticatedUser(req);
      if (auth instanceof Response) return auth;

      const body = await req.json();
      const {
        action,
        amount,
        currency = "usd",
        metadata,
        idempotency_key,
      } = body as {
        action?: string;
        amount?: unknown;
        currency?: string;
        metadata?: Record<string, string>;
        idempotency_key?: string;
      };
      if (pathname.endsWith("/stripe-payments-v2") && action !== "create-payment-intent") {
        return jsonResponse({ error: "Unsupported payment action" }, { status: 400 });
      }
      const normalizedAmount = normalizeAmount(amount);
      const normalizedCurrency = String(currency).toLowerCase();
      if (!normalizedAmount) {
        return jsonResponse({ error: "Invalid amount" }, { status: 400 });
      }
      if (!ALLOWED_CURRENCIES.has(normalizedCurrency)) {
        return jsonResponse({ error: "Invalid currency" }, { status: 400 });
      }
      if (idempotency_key && !IDEMPOTENCY_KEY_PATTERN.test(idempotency_key)) {
        return jsonResponse({ error: "Invalid idempotency key" }, { status: 400 });
      }
      const purpose = typeof metadata?.purpose === 'string' ? metadata.purpose : undefined;
      if (purpose && !ALLOWED_PAYMENT_PURPOSES.has(purpose)) {
        return jsonResponse({ error: "Invalid payment purpose" }, { status: 400 });
      }

      const pi = await stripe.paymentIntents.create(
        {
          amount: normalizedAmount,
          currency: normalizedCurrency,
          // The account receiving any wallet credit is derived from the JWT,
          // never from a client-supplied user ID.
          metadata: { ...(purpose ? { purpose } : {}), user_id: auth.id },
        },
        idempotency_key ? { idempotencyKey: idempotency_key } : undefined,
      );

      // Persist to payments table if available
      if (supabase) {
        try {
          await supabase.from("payments").insert(
            [{
              id: pi.id,
              amount: pi.amount,
              currency: pi.currency,
              status: pi.status,
              raw: pi,
            }],
          );
        } catch {
          // persistence failure is non-fatal; payment intent already created
        }
      }

      return jsonResponse({
        clientSecret: pi.client_secret,
        paymentIntentId: pi.id,
        // Temporary compatibility for direct HTTP clients using snake_case.
        client_secret: pi.client_secret,
      });
    }

    if (
      pathname.endsWith("/create-checkout-session") && req.method === "POST"
    ) {
      const auth = await requireAuthenticatedUser(req);
      if (auth instanceof Response) return auth;

      const body = await req.json() as {
        price_id?: unknown;
        quantity?: unknown;
        mode?: string;
        success_url?: unknown;
        cancel_url?: unknown;
        customer_email?: string;
      };
      const {
        price_id,
        quantity,
        mode = "payment",
        success_url,
        cancel_url,
        customer_email,
      } = body;
      const normalizedQuantity =
        typeof quantity === 'number' && Number.isInteger(quantity) ? quantity : null;
      if (
        typeof price_id !== 'string' ||
        !WASEL_PLUS_PRICE_ID ||
        price_id !== WASEL_PLUS_PRICE_ID ||
        normalizedQuantity === null || normalizedQuantity < 1 || normalizedQuantity > 12
      ) {
        return jsonResponse({ error: "Invalid checkout item" }, { status: 400 });
      }
      if (
        !isAllowedRedirectUrl(success_url) || !isAllowedRedirectUrl(cancel_url)
      ) {
        return jsonResponse({ error: "Invalid redirect URL" }, { status: 400 });
      }

      const session = await stripe.checkout.sessions.create({
        // The price is selected from a server-side allowlist. Never forward
        // client-provided Stripe price_data or arbitrary line items.
        line_items: [{ price: WASEL_PLUS_PRICE_ID, quantity: normalizedQuantity }],
        mode: mode === 'subscription' ? 'subscription' : 'payment',
        success_url,
        cancel_url,
        customer_email,
      });

      return jsonResponse({ session_id: session.id, url: session.url });
    }

    if (pathname.endsWith("/webhook") && req.method === "POST") {
      // Webhook handler: expects raw body and STRIPE_WEBHOOK_SECRET env var
      const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
      const payload = await req.text();
      if (!webhookSecret) {
        return jsonResponse({ error: "Webhook unavailable" }, { status: 500 });
      }
      const sig = req.headers.get("stripe-signature") || "";
      let event;
      try {
        event = stripe.webhooks.constructEvent(payload, sig, webhookSecret);
      } catch {
        return jsonResponse({ error: "Invalid signature" }, { status: 400 });
      }

      // Handle relevant events
      switch (event.type) {
        case "payment_intent.succeeded": {
          const pi = event.data.object;
          if (supabase) {
            // Claim the transition once. Stripe can redeliver webhooks, so only
            // the invocation that changes a non-succeeded row may credit a wallet.
            const { data: transitioned, error: transitionError } = await supabase
              .from("payments")
              .update({ status: "succeeded" })
              .eq("id", pi.id)
              .neq("status", "succeeded")
              .select("id");
            if (transitionError) throw transitionError;

            const metadata = pi.metadata ?? {};
            if (
              transitioned && transitioned.length > 0 &&
              metadata.purpose === "wallet_top_up" && metadata.user_id
            ) {
              const divisor = pi.currency === "jod" ? 1000 : 100;
              const { error: creditError } = await supabase.rpc("app_add_wallet_funds", {
                p_user_id: metadata.user_id,
                p_amount: pi.amount / divisor,
                p_payment_method: "card_payment",
                p_external_reference: pi.id,
              });
              if (creditError) throw creditError;
            }
          }
          const admin = getAdminClient();
          await publishEvent(admin, {
            id: makeId("evt"),
            topic: "payments.captured",
            payload: {
              entityId: pi.id,
              entityType: "ride",
              amount: pi.amount,
            },
            producer: "stripe-payments-v2",
            trace_id: makeId("trace"),
            occurred_at: new Date().toISOString(),
          });
          break;
        }
        case "payment_intent.payment_failed": {
          const pi = event.data.object;
          if (supabase) {
            await supabase.from("payments").update({ status: "failed" }).eq(
              "id",
              pi.id,
            );
          }
          break;
        }
        case "checkout.session.completed": {
          const session = event.data.object;
          if (supabase) {
            await supabase.from("payments").insert(
              [{
                id: session.payment_intent,
                status: "succeeded",
                raw: session,
              }],
            );
          }
          const admin = getAdminClient();
          await publishEvent(admin, {
            id: makeId("evt"),
            topic: "payments.captured",
            payload: {
              entityId: session.payment_intent as string,
              entityType: "ride",
              amount: session.amount_total ?? 0,
            },
            producer: "stripe-payments-v2",
            trace_id: makeId("trace"),
            occurred_at: new Date().toISOString(),
          });
          break;
        }
        default:
          break;
      }

      return jsonResponse({ received: true }, { status: 200 });
    }

    return jsonResponse(
      {
        status: "ok",
        routes: [
          "/create-payment-intent",
          "/create-checkout-session",
          "/webhook",
        ],
      },
    );
  } catch {
    return jsonResponse({ error: "Payment request failed" }, { status: 500 });
  }
});

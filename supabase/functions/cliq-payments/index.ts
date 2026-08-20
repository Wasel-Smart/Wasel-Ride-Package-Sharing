
import { createClient } from "npm:@supabase/supabase-js@2";
import { createRateLimitMiddleware } from "../_shared/rate-limiter.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const CLIQ_API_BASE_URL = Deno.env.get("CLIQ_API_BASE_URL") ??
  Deno.env.get("JOPACC_API_BASE_URL") ?? "";
const CLIQ_MERCHANT_ID = Deno.env.get("CLIQ_MERCHANT_ID") ??
  Deno.env.get("JOPACC_MERCHANT_ID") ?? "";
const CLIQ_API_KEY = Deno.env.get("CLIQ_API_KEY") ??
  Deno.env.get("JOPACC_API_KEY") ?? "";
const CLIQ_CHECKOUT_URL_TEMPLATE = Deno.env.get("CLIQ_CHECKOUT_URL_TEMPLATE") ??
  Deno.env.get("JOPACC_CHECKOUT_URL_TEMPLATE") ?? "";

// CliQ config is validated per-request; missing vars return 503 at runtime.

const supabase = SUPABASE_URL && SUPABASE_KEY
  ? createClient(SUPABASE_URL, SUPABASE_KEY)
  : null;
const cliqRateLimit = createRateLimitMiddleware(
  { windowMs: 60_000, maxRequests: 30 },
);



function jsonResponse(
  body: Record<string, unknown>,
  init: ResponseInit = {},
): Response {
  return new Response(JSON.stringify(body), {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    },
  });
}

const WEBHOOK_MAX_AGE_MS = 5 * 60 * 1000;
const MAX_PAYMENT_AMOUNT_MINOR = 500_000;
const MIN_PAYMENT_AMOUNT_MINOR = 50;
const MERCHANT_REFERENCE_PATTERN = /^[A-Za-z0-9_-]{1,128}$/;

async function generateSignature(
  payload: string,
  timestamp: string,
  secret: string,
): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    encoder.encode(`${timestamp}.${payload}`),
  );
  return Array.from(
    new Uint8Array(signature),
    (byte) => byte.toString(16).padStart(2, "0"),
  ).join("");
}

function signaturesMatch(actual: string, expected: string): boolean {
  if (actual.length !== expected.length) return false;
  let mismatch = 0;
  for (let index = 0; index < actual.length; index += 1) {
    mismatch |= actual.charCodeAt(index) ^ expected.charCodeAt(index);
  }
  return mismatch === 0;
}

async function requireAuthenticatedUser(
  req: Request,
): Promise<Response | null> {
  const authHeader = req.headers.get("authorization") || "";
  const token = authHeader.startsWith("Bearer ")
    ? authHeader.slice(7).trim()
    : "";

  if (!token) {
    return jsonResponse({ error: "Unauthorized" }, { status: 401 });
  }

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

  return null;
}

Deno.serve(async (req: Request) => {
  const rateLimitResponse = cliqRateLimit(req);
  if (rateLimitResponse) return rateLimitResponse;

  const url = new URL(req.url);
  const pathname = url.pathname.replace(/\/+$/, "");

  if (pathname.endsWith("/create-checkout") && req.method === "POST") {
    const authError = await requireAuthenticatedUser(req);
    if (authError) return authError;

    const body = await req.json();
    const { amount, merchantReference } = body;
    const normalizedAmount =
      typeof amount === "number" && Number.isFinite(amount)
        ? Math.round(amount)
        : null;

    if (
      normalizedAmount === null ||
      normalizedAmount < MIN_PAYMENT_AMOUNT_MINOR ||
      normalizedAmount > MAX_PAYMENT_AMOUNT_MINOR ||
      typeof merchantReference !== "string" ||
      !MERCHANT_REFERENCE_PATTERN.test(merchantReference)
    ) {
      return jsonResponse(
        { error: "Invalid payment amount or merchant reference" },
        { status: 400 },
      );
    }
    if (!CLIQ_CHECKOUT_URL_TEMPLATE || !CLIQ_MERCHANT_ID || !CLIQ_API_KEY) {
      return jsonResponse(
        { error: "CliQ checkout is not configured" },
        { status: 503 },
      );
    }

    const checkoutUrl = CLIQ_CHECKOUT_URL_TEMPLATE
      .replace("{amount}", encodeURIComponent(normalizedAmount.toString()))
      .replace("{order_id}", encodeURIComponent(merchantReference))
      .replace("{merchant_id}", encodeURIComponent(CLIQ_MERCHANT_ID));

    if (supabase) {
      const { error } = await supabase.from("payments").insert([{
        id: merchantReference,
        amount: normalizedAmount,
        currency: "JOD",
        provider: "cliq",
        merchant_reference: merchantReference,
        status: "pending",
      }]);
      if (error) {
        return jsonResponse(
          { error: "Unable to initialize payment" },
          { status: 503 },
        );
      }
    }

    return jsonResponse({ checkoutUrl, paymentId: merchantReference });
  }

  if (pathname.endsWith("/webhook") && req.method === "POST") {
    const payload = await req.text();
    const sig = req.headers.get("x-cliq-signature") || "";
    const ts = req.headers.get("x-cliq-timestamp") || "";

    const webhookSecret = Deno.env.get("CLIQ_WEBHOOK_SECRET") ?? "";
    const timestamp = Number(ts);
    if (!webhookSecret) {
      return jsonResponse(
        { error: "Webhook is not configured" },
        { status: 503 },
      );
    }
    if (
      !Number.isFinite(timestamp) ||
      Math.abs(Date.now() - timestamp) > WEBHOOK_MAX_AGE_MS
    ) {
      return jsonResponse(
        { error: "Expired or invalid webhook timestamp" },
        { status: 400 },
      );
    }
    const expectedSig = await generateSignature(payload, ts, webhookSecret);

    if (!signaturesMatch(sig, expectedSig)) {
      return jsonResponse({ error: "Invalid signature" }, { status: 400 });
    }

    let event: {
      status?: unknown;
      payment_id?: unknown;
      merchant_reference?: unknown;
    };
    try {
      event = JSON.parse(payload) as {
        status?: unknown;
        payment_id?: unknown;
        merchant_reference?: unknown;
      };
    } catch {
      return jsonResponse(
        { error: "Invalid webhook payload" },
        { status: 400 },
      );
    }

    const paymentId = typeof event.payment_id === "string"
      ? event.payment_id
      : "";
    const merchantReference = typeof event.merchant_reference === "string"
      ? event.merchant_reference
      : "";
    if (
      !paymentId ||
      (merchantReference &&
        !MERCHANT_REFERENCE_PATTERN.test(merchantReference)) ||
      (!merchantReference && !MERCHANT_REFERENCE_PATTERN.test(paymentId))
    ) {
      return jsonResponse(
        { error: "Invalid webhook payment reference" },
        { status: 400 },
      );
    }
    if (event.status !== "success" && event.status !== "failed") {
      return jsonResponse({ error: "Invalid webhook status" }, { status: 400 });
    }

    if (supabase) {
      const { error } = await supabase
        .from("payments")
        .update({
          status: event.status === "success" ? "succeeded" : "failed",
          provider_transaction_id: paymentId,
        })
        .eq("id", merchantReference || paymentId);
      if (error) {
        return jsonResponse(
          { error: "Payment update failed" },
          { status: 500 },
        );
      }
    }

    return jsonResponse({ received: true });
  }

  return jsonResponse(
    { status: "ok", routes: ["/create-checkout", "/webhook"] },
  );
});

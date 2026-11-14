/**
 * Meta Conversions API (CAPI) relay for browser-blocked conversion events.
 *
 * Env (Vercel / server):
 *   META_PIXEL_ID          — default 1062862283473154
 *   META_ACCESS_TOKEN      — required (Events Manager → Settings → Generate access token)
 *   META_TEST_EVENT_CODE   — optional; set while validating in Test Events
 */

const DEFAULT_PIXEL_ID = "1062862283473154";
const ALLOWED_EVENTS = new Set(["CompleteRegistration", "Purchase"]);

type Body = {
  eventName?: string;
  eventId?: string;
  eventSourceUrl?: string;
  storeSlug?: string;
  email?: string;
  phone?: string;
  paymentId?: string;
  value?: number | string;
  currency?: string;
};

async function sha256Hex(value: string): Promise<string> {
  const data = new TextEncoder().encode(value.trim().toLowerCase());
  const digest = await crypto.subtle.digest("SHA-256", data);
  return [...new Uint8Array(digest)]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/** Digits only for Meta phone hashing (E.164 without + is fine). */
function normalizePhone(phone: string): string {
  return phone.replace(/\D/g, "");
}

function clientIp(request: Request): string | undefined {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]?.trim() || undefined;
  return (
    request.headers.get("x-real-ip") ||
    request.headers.get("cf-connecting-ip") ||
    undefined
  );
}

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "private, no-store",
    },
  });
}

export default async function handler(request: Request) {
  if (request.method !== "POST") {
    return json({ ok: false, error: "method_not_allowed" }, 405);
  }

  const pixelId = process.env.META_PIXEL_ID || DEFAULT_PIXEL_ID;
  const accessToken = process.env.META_ACCESS_TOKEN;
  const testEventCode = process.env.META_TEST_EVENT_CODE || undefined;

  if (!accessToken) {
    return json(
      {
        ok: false,
        error: "missing_meta_access_token",
        hint: "Set META_ACCESS_TOKEN in Vercel env (Events Manager → Generate access token).",
      },
      503,
    );
  }

  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return json({ ok: false, error: "invalid_json" }, 400);
  }

  const eventName = body.eventName?.trim();
  const eventId = body.eventId?.trim();
  if (!eventName || !ALLOWED_EVENTS.has(eventName) || !eventId) {
    return json({ ok: false, error: "invalid_event" }, 400);
  }

  const valueNum =
    body.value === undefined || body.value === null || body.value === ""
      ? undefined
      : Number(body.value);
  if (eventName === "Purchase") {
    if (!Number.isFinite(valueNum) || (valueNum as number) <= 0) {
      return json({ ok: false, error: "purchase_requires_positive_value" }, 400);
    }
  }

  const userData: Record<string, unknown> = {
    client_user_agent: request.headers.get("user-agent") || undefined,
    client_ip_address: clientIp(request),
  };

  if (body.email?.trim()) {
    userData.em = [await sha256Hex(body.email)];
  }
  if (body.phone?.trim()) {
    const ph = normalizePhone(body.phone);
    if (ph) userData.ph = [await sha256Hex(ph)];
  }

  // Meta rejects events with no matchable customer info.
  if (!userData.em && !userData.ph && !userData.client_ip_address) {
    return json(
      {
        ok: false,
        error: "insufficient_user_data",
        hint: "Provide email or phone, or call from a request with a client IP.",
      },
      400,
    );
  }

  const currency =
    (body.currency || "IQD").trim().toUpperCase() || "IQD";

  const customData: Record<string, unknown> = {
    content_name: body.storeSlug || undefined,
    order_id: body.paymentId || undefined,
  };
  if (eventName === "Purchase") {
    customData.value = valueNum;
    customData.currency = currency;
  }

  const event: Record<string, unknown> = {
    event_name: eventName,
    event_time: Math.floor(Date.now() / 1000),
    event_id: eventId,
    action_source: "website",
    event_source_url:
      body.eventSourceUrl?.trim() || "https://www.mel.iq/checkout",
    user_data: userData,
    custom_data: customData,
  };

  const payload: Record<string, unknown> = {
    data: [event],
    partner_agent: "meli-web-capi-1.0",
  };
  if (testEventCode) {
    payload.test_event_code = testEventCode;
  }

  const url = `https://graph.facebook.com/v21.0/${pixelId}/events?access_token=${encodeURIComponent(accessToken)}`;
  let metaStatus = 0;
  let metaBody: unknown = null;
  try {
    const metaRes = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    });
    metaStatus = metaRes.status;
    metaBody = await metaRes.json().catch(async () => metaRes.text());
    return json(
      {
        ok: metaRes.ok,
        pixelId,
        eventName,
        eventId,
        value: valueNum ?? null,
        currency: eventName === "Purchase" ? currency : null,
        testEventCode: testEventCode || null,
        metaStatus,
        meta: metaBody,
      },
      metaRes.ok ? 200 : 502,
    );
  } catch (error) {
    return json(
      {
        ok: false,
        error: "meta_request_failed",
        message: error instanceof Error ? error.message : String(error),
        metaStatus,
        meta: metaBody,
      },
      502,
    );
  }
}

export const config = {
  runtime: "edge",
};

/**
 * Meta Pixel helpers. Base snippet (init + first PageView) lives in index.html.
 * Conversion events dual-send: browser pixel + Conversions API (same event_id).
 */

declare global {
  interface Window {
    fbq?: (...args: unknown[]) => void;
  }
}

export const META_PIXEL_ID = "1062862283473154";

const SENT_KEYS_STORAGE = "mel_fb_sent_events";

export type MetaUserHints = {
  email?: string | null;
  phone?: string | null;
};

export type CompleteRegistrationPayload = MetaUserHints & {
  eventId: string;
  storeSlug: string;
  paymentId?: string | null;
};

export type PurchasePayload = MetaUserHints & {
  /** Prefer payment id so retries/dedup stay stable. */
  eventId: string;
  paymentId: string;
  value: number;
  currency: string;
  contentName?: string | null;
};

function readSentKeys(): Set<string> {
  try {
    const raw = window.localStorage.getItem(SENT_KEYS_STORAGE);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed)
      ? new Set(parsed.filter((v): v is string => typeof v === "string"))
      : new Set();
  } catch {
    return new Set();
  }
}

function markKeySent(key: string): void {
  try {
    const sent = readSentKeys();
    sent.add(key);
    window.localStorage.setItem(SENT_KEYS_STORAGE, JSON.stringify([...sent]));
  } catch {
    // Private mode / quota — still fire once this session via in-memory only.
  }
}

function claimOnce(key: string): boolean {
  const normalized = key.trim();
  if (!normalized) return false;
  const sent = readSentKeys();
  if (sent.has(normalized)) return false;
  markKeySent(normalized);
  return true;
}

/** SPA navigations (initial PageView is already sent from index.html). */
export function trackMetaPageView(): void {
  window.fbq?.("track", "PageView");
}

type CapiBody = {
  eventName: string;
  eventId: string;
  eventSourceUrl?: string;
  storeSlug?: string;
  email?: string;
  phone?: string;
  paymentId?: string;
  value?: number;
  currency?: string;
};

async function sendCapi(eventLabel: string, body: CapiBody): Promise<void> {
  try {
    const res = await fetch("/api/meta/conversions", {
      method: "POST",
      headers: { "content-type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify({
        ...body,
        eventSourceUrl: body.eventSourceUrl || window.location.href,
      }),
    });
    const responseBody = await res.json().catch(() => null);
    console.info(`[meta] ${eventLabel} CAPI`, {
      ok: res.ok,
      status: res.status,
      body: responseBody,
    });
  } catch (error) {
    console.warn(`[meta] ${eventLabel} CAPI failed`, error);
  }
}

/**
 * Store created after checkout (paid or 0 IQD intro). Once per store.
 */
export function trackCompleteRegistration(
  payload: CompleteRegistrationPayload,
): void {
  const key = payload.eventId.trim() || payload.storeSlug.trim();
  if (!claimOnce(key)) return;

  if (window.fbq) {
    window.fbq(
      "track",
      "CompleteRegistration",
      { content_name: payload.storeSlug },
      { eventID: key },
    );
  }

  void sendCapi("CompleteRegistration", {
    eventName: "CompleteRegistration",
    eventId: key,
    storeSlug: payload.storeSlug,
    email: payload.email || undefined,
    phone: payload.phone || undefined,
    paymentId: payload.paymentId || undefined,
  });
}

/**
 * Real money payment confirmed (`status === PAID` and amount > 0).
 * Once per payment id. Includes value + currency for Meta optimization.
 */
export function trackPurchase(payload: PurchasePayload): void {
  const value = Number(payload.value);
  const currency = (payload.currency || "IQD").trim().toUpperCase() || "IQD";
  const paymentId = String(payload.paymentId || "").trim();
  const key = payload.eventId.trim() || (paymentId ? `purchase_${paymentId}` : "");

  if (!paymentId || !Number.isFinite(value) || value <= 0) return;
  if (!claimOnce(key)) return;

  const customData = {
    value,
    currency,
    content_name: payload.contentName || undefined,
    order_id: paymentId,
  };

  if (window.fbq) {
    window.fbq("track", "Purchase", customData, { eventID: key });
  }

  void sendCapi("Purchase", {
    eventName: "Purchase",
    eventId: key,
    email: payload.email || undefined,
    phone: payload.phone || undefined,
    paymentId,
    value,
    currency,
    storeSlug: payload.contentName || undefined,
  });
}

/**
 * Meta Pixel helpers. Base snippet (init + first PageView) lives in index.html.
 * SPA PageViews and conversion events go through here.
 *
 * CompleteRegistration is dual-sent: browser pixel + Conversions API (CAPI)
 * with the same event_id so Meta deduplicates.
 */

declare global {
  interface Window {
    fbq?: (...args: unknown[]) => void;
  }
}

export const META_PIXEL_ID = "1062862283473154";

const COMPLETE_REGISTRATION_KEY = "mel_fb_complete_registration";

export type CompleteRegistrationPayload = {
  /** Stable id shared with CAPI for dedup (store slug / payment id). */
  eventId: string;
  storeSlug: string;
  email?: string | null;
  phone?: string | null;
  paymentId?: string | null;
};

function readSentKeys(): Set<string> {
  try {
    const raw = window.localStorage.getItem(COMPLETE_REGISTRATION_KEY);
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
    window.localStorage.setItem(
      COMPLETE_REGISTRATION_KEY,
      JSON.stringify([...sent]),
    );
  } catch {
    // Private mode / quota — still fire once this session via in-memory only.
  }
}

/** SPA navigations (initial PageView is already sent from index.html). */
export function trackMetaPageView(): void {
  window.fbq?.("track", "PageView");
}

/**
 * Merchant completed checkout payment (or confirmed 0 IQD intro) and the store
 * was created successfully. Once per store. Never on signup click / OTP / revisit.
 */
export function trackCompleteRegistration(
  payload: CompleteRegistrationPayload,
): void {
  const key = payload.eventId.trim() || payload.storeSlug.trim();
  if (!key) return;

  const sent = readSentKeys();
  if (sent.has(key)) return;
  markKeySent(key);

  // 1) Browser pixel — visible in Network as facebook.com/tr/ and in Test Events.
  if (window.fbq) {
    window.fbq(
      "track",
      "CompleteRegistration",
      { content_name: payload.storeSlug },
      { eventID: key },
    );
  }

  // 2) Conversions API (server) — survives ad blockers; same event_id for dedup.
  void sendCompleteRegistrationCapi(payload, key);
}

async function sendCompleteRegistrationCapi(
  payload: CompleteRegistrationPayload,
  eventId: string,
): Promise<void> {
  try {
    const res = await fetch("/api/meta/conversions", {
      method: "POST",
      headers: { "content-type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify({
        eventName: "CompleteRegistration",
        eventId,
        eventSourceUrl: window.location.href,
        storeSlug: payload.storeSlug,
        email: payload.email || undefined,
        phone: payload.phone || undefined,
        paymentId: payload.paymentId || undefined,
      }),
    });
    const body = await res.json().catch(() => null);
    // Intentionally logged so Test Events debugging can inspect Meta's reply
    // from the browser Network / Console without opening server logs.
    console.info("[meta] CompleteRegistration CAPI", {
      ok: res.ok,
      status: res.status,
      body,
    });
  } catch (error) {
    console.warn("[meta] CompleteRegistration CAPI failed", error);
  }
}

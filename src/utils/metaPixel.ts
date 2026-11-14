/**
 * Meta Pixel helpers. Base snippet (init + first PageView) lives in index.html.
 * SPA PageViews and conversion events go through here.
 */

declare global {
  interface Window {
    fbq?: (...args: unknown[]) => void;
  }
}

const COMPLETE_REGISTRATION_KEY = "mel_fb_complete_registration";

function readSentPhones(): Set<string> {
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

function markPhoneSent(phone: string): void {
  try {
    const sent = readSentPhones();
    sent.add(phone);
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
 * Merchant account actually created and verified (OTP success for a new
 * signup). Never on button press, login, or store revisit. Once per phone.
 */
export function trackCompleteRegistration(phone: string): void {
  const key = phone.trim();
  if (!key || !window.fbq) return;

  const sent = readSentPhones();
  if (sent.has(key)) return;

  window.fbq("track", "CompleteRegistration");
  markPhoneSent(key);
}

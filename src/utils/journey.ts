/**
 * First-party visit counting for the owner dashboard's visitor journey
 * (admin.mel.iq → رحلة الزوار).
 *
 * Anonymous: the only id is a random one kept in this browser's localStorage
 * (no cookie, nothing tied to a name or phone), and the server stores no IP
 * address. Each step is sent at most once per day per browser; the server
 * de-duplicates again by Baghdad day.
 */

const API_BASE =
  import.meta.env.VITE_API_BASE_URL || "https://api.mel.iq/api/v1";

const VISITOR_KEY = "mel_vid";
const SENT_KEY = "mel_journey_sent";

type JourneyEvent = "visit" | "signup_open";

/** Real visitors only: no localhost, no Vercel preview deploys. */
function isLiveHost(host: string): boolean {
  return host === "mel.iq" || host.endsWith(".mel.iq");
}

function isBot(): boolean {
  if (navigator.webdriver) return true;
  return /bot|crawl|spider|slurp|headless|lighthouse|preview/i.test(navigator.userAgent);
}

function storage(): Storage | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function visitorId(store: Storage): string {
  let id = store.getItem(VISITOR_KEY);
  if (!id || !/^[A-Za-z0-9-]{8,64}$/.test(id)) {
    id =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
    store.setItem(VISITOR_KEY, id);
  }
  return id;
}

/** Support-ticket links carry their access token in the path; never send it. */
function safePath(pathname: string): string {
  return pathname.startsWith("/ticket/") ? "/ticket" : pathname;
}

/** `utm_source`, else the referring site (when it is not mel.iq itself). */
function source(): string | undefined {
  const utm = new URLSearchParams(window.location.search).get("utm_source");
  if (utm) return utm.slice(0, 100);
  if (!document.referrer) return undefined;
  try {
    const host = new URL(document.referrer).hostname;
    return isLiveHost(host) ? undefined : host;
  } catch {
    return undefined;
  }
}

/** The Baghdad calendar day (UTC+3, no daylight saving), as the server counts days. */
function today(): string {
  return new Date(Date.now() + 3 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

/**
 * Report one journey step for the current page. Safe to call on every route
 * change: anything already sent today is skipped.
 */
export function trackJourney(pathname: string): void {
  if (!isLiveHost(window.location.hostname) || isBot()) return;
  const store = storage();
  if (!store) return;

  const events: JourneyEvent[] = ["visit"];
  if (pathname === "/checkout") events.push("signup_open");

  let sent: Record<string, string> = {};
  try {
    sent = JSON.parse(store.getItem(SENT_KEY) || "{}");
  } catch {
    sent = {};
  }

  const day = today();
  const due = events.filter((event) => sent[event] !== day);
  if (due.length === 0) return;

  const id = visitorId(store);
  const device = window.matchMedia("(max-width: 767px)").matches ? "mobile" : "desktop";

  for (const event of due) {
    sent[event] = day;
    fetch(`${API_BASE}/journey/visit`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      keepalive: true,
      body: JSON.stringify({
        visitorId: id,
        event,
        path: safePath(pathname),
        source: source(),
        device,
      }),
    }).catch(() => {
      // Counting a visit must never get in the visitor's way.
    });
  }
  store.setItem(SENT_KEY, JSON.stringify(sent));
}

/**
 * First-party visit counting for the owner dashboard's visitor journey
 * (admin.mel.iq → رحلة الزوار).
 *
 * Anonymous: the only id is a random one kept in this browser's localStorage
 * (no cookie, nothing tied to a name or phone), and the server stores no IP
 * address. Country and city come from this site's edge (`/api/geo`); browser,
 * system and language from the browser itself. Each step is sent at most once per day per browser; the server
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
  return /bot|crawl|spider|slurp|headless|lighthouse|preview/i.test(
    navigator.userAgent,
  );
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

/** Browser and system names from the user agent, enough for a dashboard chart. */
function browserAndOs(): { browser?: string; os?: string } {
  const ua = navigator.userAgent;
  const browser = /Instagram/.test(ua)
    ? "Instagram"
    : /FBAN|FBAV|FB_IAB/.test(ua)
      ? "Facebook"
      : /BytedanceWebview|musical_ly|TikTok/i.test(ua)
        ? "TikTok"
        : /Snapchat/.test(ua)
          ? "Snapchat"
          : /SamsungBrowser/.test(ua)
            ? "Samsung Internet"
            : /Edg\//.test(ua)
              ? "Edge"
              : /OPR\/|Opera/.test(ua)
                ? "Opera"
                : /Firefox|FxiOS/.test(ua)
                  ? "Firefox"
                  : /Chrome|CriOS/.test(ua)
                    ? "Chrome"
                    : /Safari/.test(ua)
                      ? "Safari"
                      : undefined;
  const os = /iPhone|iPad|iPod/.test(ua)
    ? "iOS"
    : /Android/.test(ua)
      ? "Android"
      : /Windows/.test(ua)
        ? "Windows"
        : /Mac OS X|Macintosh/.test(ua)
          ? "macOS"
          : /CrOS/.test(ua)
            ? "ChromeOS"
            : /Linux/.test(ua)
              ? "Linux"
              : undefined;
  return { browser, os };
}

/** Country and city from this site's edge (`/api/geo`); nothing if it fails. */
async function place(): Promise<{ country?: string; city?: string }> {
  try {
    const res = await fetch("/api/geo", { cache: "no-store" });
    if (!res.ok) return {};
    const geo = (await res.json()) as {
      country?: string | null;
      city?: string | null;
    };
    return {
      country:
        geo.country && /^[A-Za-z]{2}$/.test(geo.country)
          ? geo.country
          : undefined,
      city: geo.city ? geo.city.slice(0, 80) : undefined,
    };
  } catch {
    return {};
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
  const device = window.matchMedia("(max-width: 767px)").matches
    ? "mobile"
    : "desktop";
  // Read now: by the time the place lookup returns the visitor may have
  // moved on and the URL lost its utm_source.
  const details = {
    source: source(),
    ...browserAndOs(),
    language: navigator.language ? navigator.language.slice(0, 20) : undefined,
  };

  for (const event of due) sent[event] = day;
  store.setItem(SENT_KEY, JSON.stringify(sent));

  void place().then((where) => {
    for (const event of due)
      send(id, event, pathname, device, { ...details, ...where });
  });
}

function send(
  id: string,
  event: JourneyEvent,
  pathname: string,
  device: string,
  details: Record<string, string | undefined>,
): void {
  fetch(`${API_BASE}/journey/visit`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    keepalive: true,
    body: JSON.stringify({
      visitorId: id,
      event,
      path: safePath(pathname),
      device,
      ...details,
    }),
  }).catch(() => {
    // Counting a visit must never get in the visitor's way.
  });
}

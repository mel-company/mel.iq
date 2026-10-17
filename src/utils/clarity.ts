/**
 * Microsoft Clarity (heatmaps + session recordings) for www.mel.iq.
 * The project ID is public (it ships in every visitor's page anyway), so it
 * lives here rather than in an env variable. Find it in Clarity under
 * Settings → Overview.
 */
const CLARITY_PROJECT_ID = "yz0ogjmdqw";

/** Real visitors only: no localhost, no Vercel preview deploys. */
function isLiveHost(host: string): boolean {
  return host === "mel.iq" || host.endsWith(".mel.iq");
}

/**
 * Public support-ticket links carry their access token in the path (/ticket/:token).
 * Clarity records the page URL, so it must not start while one of these is
 * the address; it starts once the app has moved on.
 */
function hasSecretInUrl(pathname: string): boolean {
  return pathname.startsWith("/ticket/");
}

type ClarityQueue = ((...args: unknown[]) => void) & { q?: unknown[][] };

export function loadClarity(): void {
  if (!CLARITY_PROJECT_ID || !isLiveHost(window.location.hostname)) return;

  const w = window as unknown as { clarity?: ClarityQueue };
  if (w.clarity) return;

  // Same queue stub as Clarity's own snippet, so calls made before the tag
  // finishes loading are kept.
  const clarity: ClarityQueue = (...args) => {
    (clarity.q = clarity.q || []).push(args);
  };
  w.clarity = clarity;

  const inject = () => {
    const script = document.createElement("script");
    script.async = true;
    script.src = `https://www.clarity.ms/tag/${CLARITY_PROJECT_ID}`;
    document.head.appendChild(script);
  };

  const injectWhenUrlIsClean = () => {
    if (!hasSecretInUrl(window.location.pathname)) return inject();
    const timer = window.setInterval(() => {
      if (hasSecretInUrl(window.location.pathname)) return;
      window.clearInterval(timer);
      inject();
    }, 1000);
  };

  // Wait until the page has loaded so the tag never competes with first paint.
  if (document.readyState === "complete") injectWhenUrlIsClean();
  else window.addEventListener("load", injectWhenUrlIsClean, { once: true });
}

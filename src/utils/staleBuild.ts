/**
 * Every deploy renames the JS chunks. A tab opened before the deploy still
 * asks for the old names when it lazy-loads a page, the import fails, and the
 * app used to unmount to a white screen until the visitor reloaded by hand.
 * We reload for them instead, at most once per short window so a real outage
 * cannot turn into a reload loop.
 */
const RELOAD_KEY = "mel:stale-build-reload-at";
const RELOAD_WINDOW_MS = 10_000;

export function isChunkLoadError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error ?? "");
  return /Failed to fetch dynamically imported module|error loading dynamically imported module|Importing a module script failed|Unable to preload CSS|is not a valid JavaScript MIME type|ChunkLoadError/i.test(
    message,
  );
}

/** Reloads the page unless we already did so moments ago. Returns whether it reloaded. */
export function reloadForNewBuild(): boolean {
  try {
    const last = Number(sessionStorage.getItem(RELOAD_KEY) ?? 0);
    if (Date.now() - last < RELOAD_WINDOW_MS) return false;
    sessionStorage.setItem(RELOAD_KEY, String(Date.now()));
  } catch {
    // Storage blocked: still reload once; the error screen covers a repeat.
  }
  window.location.reload();
  return true;
}

/**
 * The handle to a store generation that is running on the server.
 *
 * A run outlives the page that started it: the build continues whether or not
 * anyone is watching, so the only thing worth keeping on the client is enough
 * to find it again. This module is that handle, plus the channel the history
 * list uses to hand one back to the composer.
 */

const ACTIVE_RUN_KEY = "ai-store-active-run";

/**
 * How long a stored handle stays resumable.
 *
 * A build takes minutes; past this the row is almost certainly finished or
 * dead, and re-attaching would leave the progress modal spinning on something
 * that will never land. The window runs from `seenAt` rather than `startedAt`
 * — an old run the server has just confirmed is alive is not a stale guess.
 */
const RESUME_MAX_AGE_MS = 45 * 60 * 1000;

export type ActiveRun = {
  id: string;
  storeName?: string;
  /** When the run began on the server. Drives the progress modal's clock. */
  startedAt: number;
  /**
   * The description the run was started from.
   *
   * Carried because a resumed run may still need it: a design that was never
   * approved is continued by posting to `/generate`, which validates a prompt
   * even though it reloads the rest of its inputs from the row.
   */
  prompt?: string;
  /**
   * When this handle was last known good.
   *
   * Absent on handles written before this field existed, which is why every
   * read falls back to `startedAt`.
   */
  seenAt?: number;
};

/** The resumable run, or null when there is none / it is too old to trust. */
export function readActiveRun(): ActiveRun | null {
  try {
    const raw = localStorage.getItem(ACTIVE_RUN_KEY);
    if (!raw) return null;

    const run = JSON.parse(raw) as ActiveRun;
    // Expiry is checked before anything else so a dead handle is always swept
    // up — the auth gate below returns early, and gating first would leave
    // stale entries behind forever once a 401 has cleared the session.
    if (
      !run?.id ||
      typeof run.startedAt !== "number" ||
      Date.now() - (run.seenAt ?? run.startedAt) > RESUME_MAX_AGE_MS
    ) {
      localStorage.removeItem(ACTIVE_RUN_KEY);
      return null;
    }

    // The generation belongs to an account and the status endpoint is
    // authenticated: with no session there is nothing to poll, and resuming
    // would park the modal on a 401. The handle is kept, not dropped — signing
    // back in within the window should still pick the run up.
    if (!localStorage.getItem("token")) return null;

    return run;
  } catch {
    // Malformed or storage unavailable (private mode) — nothing to resume.
    return null;
  }
}

export function writeActiveRun(run: ActiveRun) {
  try {
    localStorage.setItem(
      ACTIVE_RUN_KEY,
      JSON.stringify({ ...run, seenAt: Date.now() } satisfies ActiveRun),
    );
  } catch {
    /* storage unavailable — the run still works, it just can't resume */
  }
}

export function clearActiveRun() {
  try {
    localStorage.removeItem(ACTIVE_RUN_KEY);
  } catch {
    /* storage unavailable; nothing to clear */
  }
}

/**
 * Ask the composer to attach to a run.
 *
 * The history list and the composer are siblings — one under the hero, the
 * other most of a page below it — and the only thing they need to say to each
 * other is this. An event keeps that from becoming a context provider wrapped
 * around the whole landing page for the sake of a single message.
 */
const RESUME_EVENT = "ai-store-resume-run";

export function requestResume(run: ActiveRun) {
  window.dispatchEvent(new CustomEvent<ActiveRun>(RESUME_EVENT, { detail: run }));
}

export function onResumeRequest(handler: (run: ActiveRun) => void) {
  const listener = (event: Event) => handler((event as CustomEvent<ActiveRun>).detail);
  window.addEventListener(RESUME_EVENT, listener);
  return () => window.removeEventListener(RESUME_EVENT, listener);
}

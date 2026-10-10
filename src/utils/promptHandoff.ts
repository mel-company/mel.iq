/**
 * Getting a merchant from somewhere else on the site to the landing page's
 * store prompt, ready to type.
 *
 * Signup ends here rather than in a store form: the AI generator names the
 * store, picks its subdomain and creates it from the prompt, so asking for
 * those by hand first only meant answering the same questions twice.
 */

/** sessionStorage key the prompt composer mirrors its draft to. */
export const PROMPT_DRAFT_KEY = "ai-store-prompt-draft";

/** Router state that tells the landing page to focus the prompt. */
export const FOCUS_PROMPT_STATE = { focusPrompt: true } as const;

export function wantsPromptFocus(state: unknown): boolean {
  return Boolean((state as { focusPrompt?: boolean } | null)?.focusPrompt);
}

/**
 * Starts the prompt from what signup already asked, so the box is not blank.
 *
 * Never overwrites a draft the merchant typed themselves (say, before they
 * were asked to sign up), and skips «أخرى», which describes nothing.
 */
export function seedPromptDraft(businessType: string, governorate: string) {
  try {
    if (sessionStorage.getItem(PROMPT_DRAFT_KEY)?.trim()) return;
    const type = businessType && businessType !== "أخرى" ? businessType : "";
    if (!type) return;
    const draft = governorate ? `متجر ${type} في ${governorate}` : `متجر ${type}`;
    sessionStorage.setItem(PROMPT_DRAFT_KEY, draft);
  } catch {
    /* storage blocked: the prompt just starts empty */
  }
}

/**
 * A generation the merchant asked for before they had an account.
 *
 * Pressing «أنشئ متجري» signed out sends them to the create-account page (the
 * one signup flow there is) rather than a sign-in window over the prompt. The
 * prompt itself survives in its draft; this flag remembers that they had
 * already pressed the button, so the run starts by itself once they are back
 * signed in. It expires so an abandoned signup cannot start a paid run days
 * later.
 */
const PENDING_GENERATION_KEY = "ai-store-pending-generation";
const PENDING_GENERATION_TTL_MS = 30 * 60 * 1000;

export function markPendingGeneration() {
  try {
    sessionStorage.setItem(PENDING_GENERATION_KEY, String(Date.now()));
  } catch {
    /* storage blocked: they press the button again after signing in */
  }
}

export function hasPendingGeneration(): boolean {
  try {
    const at = Number(sessionStorage.getItem(PENDING_GENERATION_KEY));
    return Boolean(at) && Date.now() - at < PENDING_GENERATION_TTL_MS;
  } catch {
    return false;
  }
}

/** Reads and clears the flag, so a run is resumed exactly once. */
export function takePendingGeneration(): boolean {
  const pending = hasPendingGeneration();
  try {
    sessionStorage.removeItem(PENDING_GENERATION_KEY);
  } catch {
    /* nothing to clear */
  }
  return pending;
}

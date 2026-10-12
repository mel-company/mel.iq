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

/**
 * Set when a signed-out visitor presses «أنشئ متجري»: after /checkout signup
 * brings them back, the composer starts the run they already asked for.
 */
export const PROMPT_PENDING_KEY = "ai-store-prompt-pending";

/** Router state that tells the landing page to focus the prompt. */
export const FOCUS_PROMPT_STATE = { focusPrompt: true } as const;

export function wantsPromptFocus(state: unknown): boolean {
  return Boolean((state as { focusPrompt?: boolean } | null)?.focusPrompt);
}

/** Remember that generation should start once the account exists. */
export function markPromptPending() {
  try {
    sessionStorage.setItem(PROMPT_PENDING_KEY, "1");
  } catch {
    /* storage blocked — they will press the button again */
  }
}

export function consumePromptPending(): boolean {
  try {
    if (sessionStorage.getItem(PROMPT_PENDING_KEY) !== "1") return false;
    sessionStorage.removeItem(PROMPT_PENDING_KEY);
    return true;
  } catch {
    return false;
  }
}

/** Whether a run is waiting for the account (without consuming it). */
export function hasPromptPending(): boolean {
  try {
    return sessionStorage.getItem(PROMPT_PENDING_KEY) === "1";
  } catch {
    return false;
  }
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

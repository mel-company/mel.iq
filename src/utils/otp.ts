export function getApiErrorMessage(error: unknown, fallback: string): string {
  const err = error as {
    response?: {
      data?: { message?: string | string[]; error?: string };
    };
    message?: string;
  };
  const msg = err?.response?.data?.message;
  if (typeof msg === "string" && msg.trim()) return msg;
  if (Array.isArray(msg) && msg.length) return msg.filter(Boolean).join(" ");
  if (err?.message) return err.message;
  return fallback;
}

/** Strip Nest-style `field: …` prefixes so the message can sit under the input. */
function stripFieldPrefix(message: string): string {
  return message.replace(/^[a-zA-Z_][\w.]*:\s*/u, "").trim();
}

/**
 * Server rejected a name (or similar text) for being sexual, offensive, or
 * otherwise against the content policy. The merchant must pick a different one.
 */
export function isContentPolicyError(error: unknown): boolean {
  const msg = getApiErrorMessage(error, "").toLowerCase();
  return (
    msg.includes("غير مسموح") ||
    msg.includes("غير اللائق") ||
    msg.includes("غير اخلاقي") ||
    msg.includes("غير أخلاقي") ||
    msg.includes("جنسي") ||
    msg.includes("inappropriate") ||
    msg.includes("profan") ||
    msg.includes("offensive") ||
    msg.includes("forbidden content") ||
    msg.includes("content policy")
  );
}

/** User-facing copy: change the name — keeps the server reason when present. */
export function getContentPolicyNameMessage(error: unknown): string {
  const cleaned = stripFieldPrefix(getApiErrorMessage(error, ""));
  if (cleaned && isContentPolicyError(error)) {
    return cleaned.includes("غيّر") || cleaned.includes("تغيير")
      ? cleaned
      : `${cleaned} — الرجاء تغيير الاسم واختر اسماً مناسباً.`;
  }
  return "هذا الاسم غير مسموح. الرجاء تغييره واختر اسماً مناسباً بدون ألفاظ غير لائقة.";
}

/** True when register failed because phone already exists (even if verify never finished). */
export function isPhoneTakenError(error: unknown): boolean {
  const err = error as {
    response?: {
      status?: number;
      data?: { message?: string | string[]; error?: string; code?: string };
    };
  };
  const status = err?.response?.status;
  if (status === 409 || status === 422) return true;

  const raw =
    err?.response?.data?.message ??
    err?.response?.data?.error ??
    err?.response?.data?.code ??
    "";
  const msg = (Array.isArray(raw) ? raw.join(" ") : String(raw)).toLowerCase();

  return (
    msg.includes("taken") ||
    msg.includes("exist") ||
    msg.includes("already") ||
    msg.includes("duplicate") ||
    msg.includes("مسجل") ||
    msg.includes("موجود") ||
    msg.includes("مأخوذ") ||
    msg.includes("مستخدم") ||
    (msg.includes("phone") && (msg.includes("use") || msg.includes("exist")))
  );
}

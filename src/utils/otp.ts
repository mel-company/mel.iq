
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

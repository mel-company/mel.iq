import { toast } from "sonner";

/** Extract a 4-digit OTP from common API response shapes. */
export function extractDevOtp(data: unknown): string | null {
  if (data == null || typeof data !== "object") return null;
  const d = data as Record<string, unknown>;
  const nested =
    d.data && typeof d.data === "object"
      ? (d.data as Record<string, unknown>)
      : null;

  const candidates = [
    d.codeOnlyOnDev,
    d.code,
    d.otp,
    d.devCode,
    d.dev_code,
    nested?.codeOnlyOnDev,
    nested?.code,
    nested?.otp,
  ];

  for (const c of candidates) {
    if (c == null) continue;
    const s = String(c).replace(/\D/g, "");
    if (s.length >= 4) return s.slice(0, 4);
  }
  return null;
}

/** Show OTP in a long-lived toast so testers can pass the step. */
export function showDevOtpToast(code: string | null | undefined) {
  if (!code) return;
  toast.info(`رمز التحقق للاختبار: ${code}`, {
    duration: 120_000,
    description: "انسخ الرمز وأدخله في حقل التحقق",
  });
}

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
      data?: { message?: string | string[]; error?: string };
    };
  };
  const raw =
    err?.response?.data?.message ?? err?.response?.data?.error ?? "";
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

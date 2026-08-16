import { useCallback, useState } from "react";
import { parsePhoneNumberFromString } from "libphonenumber-js";
import { authAPI } from "@/api/endpoints/auth.endpoints";
import { useAuth } from "@/contexts/AuthContext";
import { extractDevOtp, getApiErrorMessage, showDevOtpToast } from "@/utils/otp";

/**
 * Phone + OTP authentication, decoupled from any particular screen.
 *
 * Lifted out of `pages/Login.tsx` and `pages/Otp.tsx` so the AI generator's
 * modal and the standalone pages share one implementation — the modal exists
 * specifically so signing in doesn't navigate away and discard a typed prompt.
 *
 * The flow asks for a phone number first and only reveals the registration
 * fields when the backend reports no account for it, so returning users type
 * exactly one thing.
 */

export type AuthStep = "phone" | "register" | "otp";

/** Normalizes local input to E.164, or null when it isn't a valid Iraqi mobile. */
export function toE164(localPhone: string): string | null {
  const digits = localPhone.replace(/\D/g, "");
  if (!digits) return null;
  const parsed = parsePhoneNumberFromString(
    digits.startsWith("964") ? `+${digits}` : `+964${digits}`,
    "IQ",
  );
  return parsed?.isValid() ? parsed.number : null;
}

const isNoAccountError = (error: unknown): boolean => {
  const err = error as { response?: { status?: number } };
  return err?.response?.status === 404;
};

export function usePhoneOtpAuth() {
  const { login } = useAuth();

  const [step, setStep] = useState<AuthStep>("phone");
  const [phone, setPhone] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [devOtp, setDevOtp] = useState<string | null>(null);

  const reset = useCallback(() => {
    setStep("phone");
    setError("");
    setBusy(false);
    setDevOtp(null);
  }, []);

  /**
   * Sends a code to an existing account.
   *
   * Returns `"needs-registration"` rather than throwing when the number is
   * unknown, which is the signal to collect a name and email.
   */
  const requestCode = useCallback(
    async (localPhone: string): Promise<"sent" | "needs-registration"> => {
      setError("");
      const e164 = toE164(localPhone);
      if (!e164) {
        setError("رقم غير صحيح. يرجى إدخال رقم عراقي صالح.");
        throw new Error("invalid-phone");
      }

      setBusy(true);
      try {
        const data = await authAPI.login({ phone: e164 });
        setPhone(e164);
        const code = extractDevOtp(data);
        setDevOtp(code);
        showDevOtpToast(code);
        setStep("otp");
        return "sent";
      } catch (e) {
        if (isNoAccountError(e)) {
          setPhone(e164);
          setStep("register");
          return "needs-registration";
        }
        setError(getApiErrorMessage(e, "تعذر إرسال رمز التحقق. حاول مرة أخرى."));
        throw e;
      } finally {
        setBusy(false);
      }
    },
    [],
  );

  /**
   * Creates the account, which also sends the first code.
   *
   * `email` is required despite the API marking it optional: `User.email` is
   * non-nullable, so registering without one fails at the database.
   */
  const register = useCallback(
    async (params: { name: string; email: string }) => {
      setError("");
      if (!params.name.trim() || params.name.trim().length < 2) {
        setError("يرجى إدخال الاسم الكامل.");
        throw new Error("invalid-name");
      }
      if (!/^\S+@\S+\.\S+$/.test(params.email)) {
        setError("يرجى إدخال بريد إلكتروني صالح.");
        throw new Error("invalid-email");
      }

      setBusy(true);
      try {
        const data = await authAPI.register({
          phone,
          name: params.name.trim(),
          email: params.email.trim(),
        });
        const code = extractDevOtp(data);
        setDevOtp(code);
        showDevOtpToast(code);
        setStep("otp");
      } catch (e) {
        setError(getApiErrorMessage(e, "تعذر إنشاء الحساب. حاول مرة أخرى."));
        throw e;
      } finally {
        setBusy(false);
      }
    },
    [phone],
  );

  /** Verifies the code and establishes the session. */
  const verify = useCallback(
    async (code: string): Promise<boolean> => {
      setError("");
      setBusy(true);
      try {
        const result = await authAPI.verify({ phone, code });
        const token = result?.token || result?.accessToken;
        const username = result?.username || phone;

        if (!token) {
          setError("تعذر إكمال تسجيل الدخول. حاول مرة أخرى.");
          return false;
        }

        // Writes localStorage `token`, which the axios interceptor attaches.
        login(token, username);
        return true;
      } catch (e) {
        setError(getApiErrorMessage(e, "الرمز غير صحيح أو منتهي الصلاحية."));
        return false;
      } finally {
        setBusy(false);
      }
    },
    [phone, login],
  );

  const resend = useCallback(async () => {
    if (!phone) return;
    setBusy(true);
    setError("");
    try {
      const data = await authAPI.login({ phone });
      const code = extractDevOtp(data);
      setDevOtp(code);
      showDevOtpToast(code);
    } catch (e) {
      setError(getApiErrorMessage(e, "تعذر إعادة إرسال الرمز."));
    } finally {
      setBusy(false);
    }
  }, [phone]);

  return {
    step,
    phone,
    error,
    busy,
    devOtp,
    setStep,
    setError,
    requestCode,
    register,
    verify,
    resend,
    reset,
  };
}

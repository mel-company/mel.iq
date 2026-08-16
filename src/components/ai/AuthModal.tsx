import { useEffect, useRef, useState } from "react";
import { X, Loader2 } from "lucide-react";
import { usePhoneOtpAuth } from "@/hooks/usePhoneOtpAuth";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";

/**
 * Sign-in for the AI store generator.
 *
 * Deliberately a modal rather than a route: the user has already typed a
 * prompt, and navigating to /login would throw it away.
 *
 * Google and email/password are rendered but disabled — the backend has
 * neither today (auth is phone + OTP, `User.password` is never verified), so
 * showing them as live options would be a lie. `VITE_FEATURE_SOCIAL_AUTH`
 * turns them on once that lands.
 */

const SOCIAL_AUTH_ENABLED =
  import.meta.env.VITE_FEATURE_SOCIAL_AUTH === "true";

interface AuthModalProps {
  open: boolean;
  onClose: () => void;
  onAuthenticated: () => void;
}

export default function AuthModal({
  open,
  onClose,
  onAuthenticated,
}: AuthModalProps) {
  const auth = usePhoneOtpAuth();
  const [localPhone, setLocalPhone] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) return;
    // Reset only on close so a re-open starts clean.
    auth.reset();
    setCode("");
  }, [open]);

  useEffect(() => {
    if (auth.devOtp) setCode(auth.devOtp);
  }, [auth.devOtp]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    if (open) document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  const submitPhone = async () => {
    try {
      await auth.requestCode(localPhone);
    } catch {
      /* the hook surfaces the message */
    }
  };

  const submitRegister = async () => {
    try {
      await auth.register({ name, email });
    } catch {
      /* the hook surfaces the message */
    }
  };

  const submitCode = async (value: string) => {
    if (value.length < 4 || auth.busy) return;
    const ok = await auth.verify(value);
    if (ok) onAuthenticated();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="auth-modal-title"
        className="relative w-full max-w-md rounded-2xl bg-[#1e1b4b] border border-white/10 p-6 sm:p-8 shadow-2xl"
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="إغلاق"
          className="absolute top-4 left-4 text-white/40 hover:text-white/80 transition-colors"
        >
          <X size={20} />
        </button>

        <h2
          id="auth-modal-title"
          className="text-xl font-bold text-white mb-2 text-center"
        >
          {auth.step === "otp" ? "أدخل رمز التحقق" : "أنشئ متجرك بالذكاء الاصطناعي"}
        </h2>
        <p className="text-sm text-white/50 mb-6 text-center">
          {auth.step === "phone" && "سجّل الدخول لنبدأ بإنشاء متجرك"}
          {auth.step === "register" && "لا يوجد حساب بهذا الرقم — أكمل بياناتك"}
          {auth.step === "otp" && `أرسلنا رمزاً إلى ${auth.phone}`}
        </p>

        {auth.error && (
          <div className="mb-4 rounded-lg bg-red-500/10 border border-red-500/30 px-4 py-2 text-sm text-red-300">
            {auth.error}
          </div>
        )}

        {auth.step === "phone" && (
          <div className="space-y-4">
            <div>
              <label htmlFor="ai-phone" className="block text-sm text-white/70 mb-2">
                رقم الهاتف
              </label>
              <div className="flex items-center gap-2" dir="ltr">
                <span className="shrink-0 rounded-lg bg-white/5 border border-white/10 px-3 py-3 text-white/70 text-sm">
                  +964
                </span>
                <input
                  id="ai-phone"
                  type="tel"
                  inputMode="numeric"
                  autoFocus
                  value={localPhone}
                  onChange={(e) =>
                    setLocalPhone(e.target.value.replace(/\D/g, ""))
                  }
                  onKeyDown={(e) => e.key === "Enter" && submitPhone()}
                  placeholder="7XX XXX XXXX"
                  className="w-full rounded-lg bg-white/5 border border-white/10 px-4 py-3 text-white placeholder:text-white/25 focus:outline-none focus:border-[#00c8ff]/60"
                />
              </div>
            </div>

            <button
              type="button"
              onClick={submitPhone}
              disabled={auth.busy || localPhone.length < 10}
              className="w-full rounded-full bg-[#00c8ff] py-3 font-medium text-white transition-colors hover:bg-[#33d4ff] disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {auth.busy && <Loader2 size={16} className="animate-spin" />}
              متابعة
            </button>

            {!SOCIAL_AUTH_ENABLED && (
              <>
                <div className="flex items-center gap-3 py-1">
                  <span className="h-px flex-1 bg-white/10" />
                  <span className="text-xs text-white/30">أو</span>
                  <span className="h-px flex-1 bg-white/10" />
                </div>
                <button
                  type="button"
                  disabled
                  title="قريباً"
                  className="w-full rounded-full border border-white/10 bg-white/[0.03] py-3 text-sm text-white/30 cursor-not-allowed"
                >
                  المتابعة عبر Google — قريباً
                </button>
              </>
            )}
          </div>
        )}

        {auth.step === "register" && (
          <div className="space-y-4">
            <div>
              <label htmlFor="ai-name" className="block text-sm text-white/70 mb-2">
                الاسم الكامل
              </label>
              <input
                id="ai-name"
                autoFocus
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded-lg bg-white/5 border border-white/10 px-4 py-3 text-white placeholder:text-white/25 focus:outline-none focus:border-[#00c8ff]/60"
              />
            </div>
            <div>
              <label htmlFor="ai-email" className="block text-sm text-white/70 mb-2">
                البريد الإلكتروني
              </label>
              <input
                id="ai-email"
                type="email"
                dir="ltr"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && submitRegister()}
                className="w-full rounded-lg bg-white/5 border border-white/10 px-4 py-3 text-white placeholder:text-white/25 focus:outline-none focus:border-[#00c8ff]/60"
              />
            </div>
            <button
              type="button"
              onClick={submitRegister}
              disabled={auth.busy}
              className="w-full rounded-full bg-[#00c8ff] py-3 font-medium text-white transition-colors hover:bg-[#33d4ff] disabled:opacity-40 flex items-center justify-center gap-2"
            >
              {auth.busy && <Loader2 size={16} className="animate-spin" />}
              إنشاء الحساب
            </button>
          </div>
        )}

        {auth.step === "otp" && (
          <div className="space-y-5">
            <div className="flex justify-center" dir="ltr">
              <InputOTP
                maxLength={4}
                value={code}
                onChange={(value) => {
                  setCode(value);
                  if (value.length === 4) submitCode(value);
                }}
              >
                <InputOTPGroup>
                  <InputOTPSlot index={0} />
                  <InputOTPSlot index={1} />
                  <InputOTPSlot index={2} />
                  <InputOTPSlot index={3} />
                </InputOTPGroup>
              </InputOTP>
            </div>

            <button
              type="button"
              onClick={() => submitCode(code)}
              disabled={auth.busy || code.length < 4}
              className="w-full rounded-full bg-[#00c8ff] py-3 font-medium text-white transition-colors hover:bg-[#33d4ff] disabled:opacity-40 flex items-center justify-center gap-2"
            >
              {auth.busy && <Loader2 size={16} className="animate-spin" />}
              تأكيد
            </button>

            <button
              type="button"
              onClick={auth.resend}
              disabled={auth.busy}
              className="w-full text-sm text-white/40 hover:text-white/70 transition-colors"
            >
              إعادة إرسال الرمز
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

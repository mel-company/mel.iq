import { useEffect } from "react";
import ModalPortal from "./ModalPortal";
import { X } from "@/components/icons";
import SignupFlow from "@/components/auth/SignupFlow";

/**
 * The create-account form, opened over the landing prompt.
 *
 * A window rather than a trip to /checkout because the merchant has already
 * typed a prompt and pressed «أنشئ متجري»: navigating away would interrupt the
 * generation they asked for. The form inside is the create-account page's own
 * (`SignupFlow`), so there is still one way to make an account; «لديك حساب؟»
 * signs in by phone in place.
 */
export default function SignupModal({
  open,
  onClose,
  onAuthenticated,
}: {
  open: boolean;
  onClose: () => void;
  onAuthenticated: () => void;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    // The page behind should not scroll under a long form on a phone.
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflow;
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <ModalPortal>
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 py-6 sm:py-8"
        onClick={(e) => e.target === e.currentTarget && onClose()}
      >
        <div
          role="dialog"
          aria-modal="true"
          aria-label="أنشئ حسابك"
          className="relative max-h-full w-full max-w-lg overflow-y-auto rounded-[28px] border border-white/[0.07] bg-[#0a0d1c] p-6 pt-12 text-right shadow-2xl sm:p-8 sm:pt-12"
        >
          <button
            type="button"
            onClick={onClose}
            aria-label="إغلاق"
            className="absolute left-4 top-4 rounded-full p-1.5 text-white/40 transition-colors hover:bg-white/5 hover:text-white/80"
          >
            <X size={20} />
          </button>
          <SignupFlow
            layout="modal"
            createdMessage="تم إنشاء حسابك! جاري إنشاء متجرك"
            onAuthenticated={onAuthenticated}
          />
        </div>
      </div>
    </ModalPortal>
  );
}

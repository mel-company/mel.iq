import { useEffect, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { usePlatformPaymentStatus } from "@/api/wrappers/platform-payment.wrapper";

const CHECKOUT_DRAFT_KEY = "mel_checkout_draft";

export default function CheckoutPaymentReturn() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const paymentId = params.get("paymentId");
  const result = params.get("result");

  const { data, isLoading, isError } = usePlatformPaymentStatus(
    paymentId,
    !!paymentId,
  );

  const status = data?.status as string | undefined;

  const draft = useMemo(() => {
    try {
      const raw = sessionStorage.getItem(CHECKOUT_DRAFT_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }, []);

  useEffect(() => {
    if (!paymentId) {
      toast.error("معرف الدفع مفقود");
      navigate("/checkout", { replace: true });
      return;
    }

    if (result === "failure" || status === "FAILED" || status === "EXPIRED") {
      toast.error("فشلت عملية الدفع. حاول مرة أخرى.");
      navigate("/checkout", {
        replace: true,
        state: { skipToStep: 4, selectedPlan: draft?.plan, paymentFailed: true },
      });
      return;
    }

    if (status === "PAID") {
      toast.success("تم الدفع بنجاح");
      navigate("/checkout", {
        replace: true,
        state: {
          skipToStep: 5,
          selectedPlan: draft?.plan,
          paymentId,
          paymentCompleted: true,
          checkoutDraft: draft,
        },
      });
    }
  }, [paymentId, result, status, navigate, draft]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-white dark:bg-black">
      <div className="text-center px-6">
        <div className="animate-spin rounded-full h-14 w-14 border-4 border-slate-200 border-t-slate-900 dark:border-slate-700 dark:border-t-slate-100 mx-auto mb-4" />
        <p className="text-slate-700 dark:text-slate-300 font-medium">
          {isLoading || status === "PENDING"
            ? "جاري التحقق من الدفع..."
            : isError
              ? "تعذر التحقق من الدفع"
              : "جاري المتابعة..."}
        </p>
      </div>
    </div>
  );
}

export { CHECKOUT_DRAFT_KEY };

import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { Check, Loader2 } from "@/components/icons";
import { PageGround } from "@/components/dashboard/chrome";
import { domainAPI } from "@/api/endpoints/domain.endpoints";
import {
  clearDomainConnectPending,
  readDomainConnectPending,
} from "@/utils/domainConnectPending";
import { useAuth } from "@/contexts/AuthContext";

const DASHBOARD = "/dashboard";
const REDIRECT_MS = 1800;

/**
 * Cloudflare Domain Connect returns here after the merchant authorizes DNS.
 * We attach the domain to the store, show success, then send them to the
 * dashboard.
 */
export default function DomainConnectDone() {
  const { user, loading: authLoading } = useAuth();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<"working" | "ok" | "error">("working");
  const [message, setMessage] = useState("جاري إكمال ربط الدومين…");
  const [domainLabel, setDomainLabel] = useState<string | null>(null);
  const started = useRef(false);

  useEffect(() => {
    if (authLoading || started.current) return;
    started.current = true;

    const run = async () => {
      if (!user) {
        setStatus("error");
        setMessage("سجّل الدخول أولاً ثم أعد محاولة الربط التلقائي.");
        return;
      }

      const pending = readDomainConnectPending();
      const domainFromQuery =
        searchParams.get("domain")?.trim().toLowerCase() || "";
      const domain = (pending?.domain || domainFromQuery).replace(/^www\./, "");
      const storeId = pending?.storeId;

      if (!domain || !storeId) {
        setStatus("error");
        setMessage(
          "ما لقينا بيانات الربط. ارجع لإدارة المتجر واضغط «ربط تلقائي» من جديد.",
        );
        return;
      }

      setDomainLabel(domain);

      try {
        await domainAPI.setCustomDomain({ domain, storeId });
        clearDomainConnectPending();
        setStatus("ok");
        setMessage(`تم ربط ${domain} بالمتجر بنجاح.`);
        toast.success("تم بنجاح");
        window.setTimeout(() => {
          navigate(DASHBOARD, { replace: true });
        }, REDIRECT_MS);
      } catch (error: unknown) {
        const err = error as { response?: { data?: { message?: string | string[] } } };
        const raw = err?.response?.data?.message;
        const detail = Array.isArray(raw)
          ? raw.join(" — ")
          : raw || "تعذر إكمال ربط الدومين";
        setStatus("error");
        setMessage(detail);
        toast.error(detail);
      }
    };

    void run();
  }, [authLoading, user, searchParams, navigate]);

  return (
    <div className="relative min-h-screen overflow-hidden">
      <PageGround />
      <div className="relative z-10 flex min-h-screen items-center justify-center px-4 py-16">
        <div className="w-full max-w-md rounded-3xl border border-black/8 bg-white/80 p-8 text-center shadow-[0_24px_80px_-40px_rgba(15,20,50,0.35)] backdrop-blur-xl dark:border-white/10 dark:bg-white/[0.04] dark:shadow-2xl">
          {status === "working" && (
            <>
              <div className="mx-auto flex size-16 items-center justify-center rounded-2xl border border-brand-indigo/25 bg-brand-indigo/10 dark:border-brand-primary/30 dark:bg-brand-primary/10">
                <Loader2
                  size={28}
                  className="animate-spin text-brand-indigo dark:text-brand-primary"
                />
              </div>
              <h1 className="mt-6 text-xl font-bold text-[#0b1020] dark:text-frost">
                جاري إكمال الربط
              </h1>
              <p className="mt-3 text-sm leading-7 text-[#5b6178] dark:text-muted">
                {message}
              </p>
            </>
          )}

          {status === "ok" && (
            <>
              <div className="mx-auto flex size-16 items-center justify-center rounded-2xl border border-mint/35 bg-mint/12">
                <Check size={28} className="text-[#00795a] dark:text-mint" />
              </div>
              <h1 className="mt-6 text-xl font-bold text-[#0b1020] dark:text-frost">
                تم بنجاح
              </h1>
              <p className="mt-3 text-sm leading-7 text-[#5b6178] dark:text-muted">
                {message}
              </p>
              {domainLabel && (
                <p
                  dir="ltr"
                  className="mt-2 text-sm font-semibold text-brand-indigo dark:text-brand-primary"
                >
                  {domainLabel}
                </p>
              )}
              <p className="mt-5 text-xs text-[#8a90a8] dark:text-dim">
                جاري تحويلك إلى لوحة التحكم…
              </p>
              <Link
                to={DASHBOARD}
                className="mt-6 inline-flex h-11 items-center justify-center rounded-2xl bg-gradient-to-l from-brand-violet to-brand-indigo px-5 text-sm font-bold text-white transition-opacity hover:opacity-90"
              >
                الذهاب للوحة التحكم
              </Link>
            </>
          )}

          {status === "error" && (
            <>
              <div className="mx-auto flex size-16 items-center justify-center rounded-2xl border border-[#ff5c7a]/35 bg-[#ff5c7a]/10">
                <span className="text-2xl font-bold text-[#b62347] dark:text-[#ff8da3]">
                  !
                </span>
              </div>
              <h1 className="mt-6 text-xl font-bold text-[#0b1020] dark:text-frost">
                تعذر إكمال الربط
              </h1>
              <p className="mt-3 text-sm leading-7 text-[#5b6178] dark:text-muted">
                {message}
              </p>
              <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
                <Link
                  to={DASHBOARD}
                  className="inline-flex h-11 items-center justify-center rounded-2xl bg-gradient-to-l from-brand-violet to-brand-indigo px-5 text-sm font-bold text-white transition-opacity hover:opacity-90"
                >
                  الذهاب للوحة التحكم
                </Link>
                <Link
                  to="/"
                  className="inline-flex h-11 items-center justify-center rounded-2xl border border-black/10 bg-black/[0.03] px-5 text-sm font-bold text-[#0b1020] transition-colors hover:bg-black/[0.06] dark:border-white/12 dark:bg-white/5 dark:text-frost dark:hover:bg-white/10"
                >
                  الصفحة الرئيسية
                </Link>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

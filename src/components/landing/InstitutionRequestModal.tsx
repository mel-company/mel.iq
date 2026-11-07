import { useEffect, useState } from "react";
import ModalPortal from "@/components/ai/ModalPortal";
import { Loader2, Send, X } from "@/components/icons";
import { toast } from "sonner";
import { useSubmitInstitutionPlan } from "@/api/wrappers/contact.wrappers";
import { getApiErrorMessage } from "@/utils/otp";
import { iqPhoneError, toIqE164 } from "@/utils/phone";

const MESSAGE_MAX = 1000;

/** Inputs that stay readable on both the light paper ground and dark field. */
const INPUT =
  "w-full rounded-2xl border border-black/10 bg-black/[0.02] px-4 py-3.5 text-sm text-frost outline-none transition-colors placeholder:text-dim focus:border-brand-indigo dark:border-field-line dark:bg-field dark:focus:border-brand-primary";

const EMPTY = {
  name: "",
  email: "",
  phone: "",
  companyName: "",
  jobTitle: "",
  companySize: "",
  message: "",
  lpReference: "",
};

function Field({
  label,
  hint,
  hintTone,
  required,
  children,
}: {
  label: string;
  hint?: string;
  hintTone?: "error";
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="flex w-full flex-col gap-1.5 text-right">
      <span className="text-sm font-medium text-muted">
        {label}
        {required ? (
          <span className="text-rose-500 dark:text-rose-400"> *</span>
        ) : null}
      </span>
      {children}
      {hint ? (
        <span
          className={`text-xs ${
            hintTone === "error"
              ? "text-rose-500 dark:text-rose-400"
              : "text-dim"
          }`}
        >
          {hint}
        </span>
      ) : null}
    </label>
  );
}

type Props = {
  open: boolean;
  onClose: () => void;
};

/**
 * Sales form for the «مؤسسي» pricing card. Not checkout — a structured lead
 * that becomes a HIGH-priority SALES ticket and emails the sales inbox.
 */
function InstitutionRequestModal({ open, onClose }: Props) {
  const [form, setForm] = useState(EMPTY);
  const [phoneError, setPhoneError] = useState("");
  const { mutate: submit, isPending } = useSubmitInstitutionPlan();

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !isPending) onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, isPending, onClose]);

  useEffect(() => {
    if (!open) {
      setForm(EMPTY);
      setPhoneError("");
    }
  }, [open]);

  if (!open) return null;

  const set =
    (key: keyof typeof form) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm((prev) => ({ ...prev, [key]: e.target.value }));

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (isPending) return;

    const phoneErr = iqPhoneError(form.phone);
    if (phoneErr) {
      setPhoneError(phoneErr);
      return;
    }
    const phone = toIqE164(form.phone);
    if (!phone) {
      setPhoneError("رقم الهاتف غير صحيح");
      return;
    }
    setPhoneError("");

    submit(
      {
        name: form.name.trim(),
        email: form.email.trim(),
        phone,
        companyName: form.companyName.trim(),
        jobTitle: form.jobTitle.trim() || undefined,
        companySize: form.companySize.trim() || undefined,
        message: form.message.trim(),
        lpReference: form.lpReference,
      },
      {
        onSuccess: (data) => {
          toast.success(
            data?.message ||
              "تم استلام طلب خطة المؤسسات، سيتواصل معك فريق المبيعات قريباً",
          );
          setForm(EMPTY);
          onClose();

          const chatUrl = data?.chatUrl ?? undefined;
          if (chatUrl) {
            toast.message("تم فتح محادثة الطلب", {
              description: "احفظ الرابط لمتابعة الردود من فريق المبيعات",
              action: {
                label: "افتح المحادثة",
                onClick: () => window.open(chatUrl, "_blank", "noopener"),
              },
              duration: 12000,
            });
            window.setTimeout(() => {
              window.location.href = chatUrl;
            }, 800);
          }
        },
        onError: (error) => {
          toast.error(
            getApiErrorMessage(
              error,
              "تعذر إرسال الطلب. يرجى المحاولة مرة أخرى.",
            ),
          );
        },
      },
    );
  };

  return (
    <ModalPortal>
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4 py-6 backdrop-blur-sm animate-[modal-fade_160ms_ease-out] dark:bg-[#05030f]/70"
        onClick={(e) => {
          if (e.target === e.currentTarget && !isPending) onClose();
        }}
      >
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="institution-request-title"
          className="relative flex max-h-[min(92vh,720px)] w-full max-w-[34rem] flex-col overflow-hidden rounded-3xl bg-gradient-to-b from-black/10 via-black/5 to-transparent p-px shadow-[0_24px_64px_rgba(15,23,42,0.18)] animate-[modal-rise_200ms_ease-out] dark:from-white/14 dark:via-white/6 dark:to-white/[0.02] dark:shadow-[0_30px_80px_rgba(0,0,0,0.55)]"
        >
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-3xl bg-white dark:bg-[#0a0722]">
            {/* Sticky header */}
            <div className="flex shrink-0 items-start justify-between gap-4 border-b border-black/8 px-5 py-5 sm:px-7 dark:border-white/8">
              <div className="min-w-0 text-right">
                <p className="text-xs font-semibold tracking-wide text-eyebrow">
                  باقة مؤسسي
                </p>
                <h2
                  id="institution-request-title"
                  className="mt-1 text-xl font-extrabold text-frost sm:text-2xl"
                >
                  اطلب عرض خطة المؤسسات
                </h2>
                <p className="mt-1.5 text-sm leading-6 text-prose">
                  املأ البيانات وسيتواصل معك فريق المبيعات لتصميم حل يناسب
                  فروعك ومتطلباتك.
                </p>
              </div>
              <button
                type="button"
                onClick={onClose}
                disabled={isPending}
                aria-label="إغلاق"
                className="flex size-9 shrink-0 items-center justify-center rounded-xl border border-black/10 bg-black/[0.03] text-frost transition-colors hover:bg-black/[0.06] disabled:opacity-30 dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10"
              >
                <X size={18} />
              </button>
            </div>

            <form
              onSubmit={handleSubmit}
              className="flex min-h-0 flex-1 flex-col"
            >
              <div className="flex-1 space-y-4 overflow-y-auto px-5 py-5 sm:px-7">
                <Field label="اسم الشركة / المؤسسة" required>
                  <input
                    required
                    maxLength={160}
                    autoComplete="organization"
                    className={INPUT}
                    placeholder="مثال: مجموعة الرافدين"
                    value={form.companyName}
                    onChange={set("companyName")}
                  />
                </Field>

                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="اسمك الكامل" required>
                    <input
                      required
                      maxLength={120}
                      autoComplete="name"
                      className={INPUT}
                      placeholder="محمد علي"
                      value={form.name}
                      onChange={set("name")}
                    />
                  </Field>
                  <Field label="المسمى الوظيفي" hint="اختياري">
                    <input
                      maxLength={120}
                      autoComplete="organization-title"
                      className={INPUT}
                      placeholder="مدير العمليات"
                      value={form.jobTitle}
                      onChange={set("jobTitle")}
                    />
                  </Field>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="البريد الإلكتروني" required>
                    <input
                      required
                      type="email"
                      maxLength={160}
                      autoComplete="email"
                      dir="ltr"
                      className={`${INPUT} text-left`}
                      placeholder="you@company.iq"
                      value={form.email}
                      onChange={set("email")}
                    />
                  </Field>
                  <Field
                    label="رقم الهاتف"
                    required
                    hint={phoneError || "رقم عراقي للتواصل"}
                    hintTone={phoneError ? "error" : undefined}
                  >
                    <input
                      required
                      type="tel"
                      inputMode="tel"
                      autoComplete="tel"
                      dir="ltr"
                      className={`${INPUT} text-left`}
                      placeholder="0770 123 4567"
                      value={form.phone}
                      onChange={(e) => {
                        setPhoneError("");
                        set("phone")(e);
                      }}
                    />
                  </Field>
                </div>

                <Field
                  label="حجم المشروع"
                  hint="اختياري — عدد الفروع أو المستخدمين تقريباً"
                >
                  <input
                    maxLength={160}
                    className={INPUT}
                    placeholder="مثال: 8 فروع / 25 مستخدم"
                    value={form.companySize}
                    onChange={set("companySize")}
                  />
                </Field>

                <Field label="احتياجاتكم" required>
                  <textarea
                    required
                    rows={4}
                    maxLength={MESSAGE_MAX}
                    className={`${INPUT} min-h-[110px] resize-y`}
                    placeholder="صفوا متطلباتكم: فروع، ERP، API، تكاملات خاصة…"
                    value={form.message}
                    onChange={set("message")}
                  />
                  <span
                    className="mt-1 block text-left text-[11px] text-dim"
                    dir="ltr"
                  >
                    {form.message.length}/{MESSAGE_MAX}
                  </span>
                </Field>

                {/* Honeypot — off-screen; bots fill every input. */}
                <input
                  tabIndex={-1}
                  autoComplete="off"
                  aria-hidden
                  className="absolute -left-[9999px] h-0 w-0 opacity-0"
                  value={form.lpReference}
                  onChange={set("lpReference")}
                />
              </div>

              {/* Sticky footer */}
              <div className="shrink-0 border-t border-black/8 px-5 py-4 sm:px-7 dark:border-white/8">
                <button
                  type="submit"
                  disabled={isPending}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-l from-brand-violet to-brand-indigo px-6 py-3.5 text-sm font-bold text-white shadow-[0_16px_40px_-18px_rgba(79,96,249,0.9)] transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isPending ? (
                    <>
                      <Loader2 size={18} className="animate-spin" />
                      جاري الإرسال…
                    </>
                  ) : (
                    <>
                      إرسال الطلب لفريق المبيعات
                      <Send size={16} />
                    </>
                  )}
                </button>
                <p className="mt-2.5 text-center text-xs leading-5 text-dim">
                  الطلب يصل مباشرة لفريق المبيعات كتذكرة عالية الأولوية.
                </p>
              </div>
            </form>
          </div>
        </div>
      </div>
    </ModalPortal>
  );
}

export default InstitutionRequestModal;

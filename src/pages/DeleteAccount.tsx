import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { Loader2 } from "@/components/icons";
import { useSubmitContact } from "@/api/wrappers/contact.wrappers";
import { getApiErrorMessage } from "@/utils/otp";
import { iqPhoneError, toIqE164 } from "@/utils/phone";

type Lang = "ar" | "en";

const INPUT =
  "w-full rounded-[14px] border border-white/10 bg-white/[0.04] px-4 py-3.5 text-sm text-frost placeholder:text-dim outline-none transition-shadow focus:ring-2 focus:ring-brand-primary/40";

const COPY = {
  ar: {
    eyebrow: "MEL",
    title: "حذف حساب MEL",
    updated: "آخر تحديث: 26 سبتمبر 2026",
    intro:
      "هذه الصفحة مخصّصة لطلب حذف حسابك على MEL (mel.iq) والبيانات المرتبطة به. الطلب مستقل عن التطبيق، ويمكن إكماله من المتصفح بدون تسجيل دخول.",
    howTitle: "طريقة طلب الحذف",
    how: [
      "أدخل الاسم ورقم الهاتف المرتبط بالحساب، وبريداً إلكترونياً للرد عليك.",
      "أرسل الطلب من النموذج أدناه، أو راسل privacy@mel.iq بعنوان واضح: طلب حذف حساب MEL.",
      "نتحقق من أن الرقم يخصّك قبل التنفيذ. قد نطلب تأكيداً إضافياً عبر الهاتف أو البريد.",
      "نعالج الطلب عادة خلال 30 يوماً من التحقق. المتاجر تُحذف أولاً حذفاً ناعماً لمدة 30 يوماً ثم يُزال الحساب نهائياً.",
    ],
    deletedTitle: "البيانات التي تُحذف",
    deleted: [
      "حساب المستخدم: رقم الهاتف، الاسم، والبريد الإلكتروني",
      "جلسات الدخول ورموز المصادقة",
      "المتاجر المرتبطة: الاسم، الشعار، المنتجات، الصور، والإعدادات",
      "بيانات المساعد الذكي والرصيد غير المستخدم المرتبط بالحساب",
      "الدومينات الفرعية على MEL والإعدادات المخزّنة لدينا",
    ],
    keptTitle: "ما قد نحتفظ به، ولماذا",
    kept: [
      "المتاجر تُحذف حذفاً ناعماً لمدة 30 يوماً لاسترجاع محتمل، ثم الحذف النهائي.",
      "سجلات الدفع والاشتراك (المبلغ، الحالة، ومعرّف العملية دون رقم البطاقة) للمدة التي يفرضها القانون أو المحاسبة ومكافحة الاحتيال.",
      "تذاكر الدعم المرتبطة بطلب الحذف حتى إغلاق الطلب.",
      "ما يُلزمنا القانون بالاحتفاظ به، ولا نستخدمه لأغراض تسويقية.",
    ],
    helpTitle: "إذا واجهت مشكلة",
    help:
      "إذا لم يصلك رد أو احتجت مساعدة في الطلب، راسل الدعم أو الخصوصية. لا نحذف حساباً دون التحقق من الهوية.",
    formTitle: "نموذج طلب الحذف",
    name: "الاسم",
    phone: "رقم هاتف حساب MEL",
    phoneHint: "الرقم المسجّل في MEL، مثل 0770…",
    email: "البريد الإلكتروني",
    emailHint: "للرد على طلبك",
    message: "ملاحظات إضافية (اختياري)",
    confirm:
      "أؤكد أنني صاحب هذا الحساب وأطلب حذف حساب MEL وبياناته وفق السياسة أعلاه.",
    submit: "إرسال طلب الحذف",
    sending: "جاري الإرسال…",
    successTitle: "وصل طلبك",
    successBody:
      "سنتحقق من رقم الهاتف ثم نحذف الحساب وفق السياسة. إن احتجنا تأكيداً إضافياً سنتواصل معك.",
    another: "إرسال طلب آخر",
    privacy: "سياسة الخصوصية",
    namePh: "اسمك",
    emailPh: "you@example.com",
    messagePh: "أي تفاصيل تساعدنا في إيجاد الحساب",
    confirmError: "يلزم التأكيد قبل الإرسال",
    phoneRequired: "رقم الهاتف مطلوب لتحديد حساب MEL",
  },
  en: {
    eyebrow: "MEL",
    title: "Delete your MEL account",
    updated: "Last updated: 26 September 2026",
    intro:
      "Use this page to request deletion of your MEL (mel.iq) account and related data. The request is independent of the app and can be completed in a browser without signing in.",
    howTitle: "How to request deletion",
    how: [
      "Enter the name and phone number on the account, plus an email so we can reply.",
      "Submit the form below, or email privacy@mel.iq with a clear subject: MEL account deletion request.",
      "We verify that the number belongs to you before acting. We may ask for extra confirmation by phone or email.",
      "We usually complete the request within 30 days of verification. Stores are soft-deleted for 30 days first, then the account is removed permanently.",
    ],
    deletedTitle: "Data we delete",
    deleted: [
      "User account: phone number, name, and email",
      "Sign-in sessions and authentication tokens",
      "Linked stores: name, logo, products, images, and settings",
      "AI assistant data and unused credits on the account",
      "MEL subdomains and settings we store",
    ],
    keptTitle: "What we may keep, and for how long",
    kept: [
      "Stores are soft-deleted for 30 days in case restoration is needed, then permanently removed.",
      "Payment and subscription records (amount, status, and transaction id — not the full card number) for as long as law, accounting, or fraud prevention requires.",
      "Support tickets for this deletion request until the request is closed.",
      "Anything we are legally required to retain. We do not use retained records for marketing.",
    ],
    helpTitle: "If something goes wrong",
    help:
      "If you do not hear back or need help with the request, email support or privacy. We do not delete an account without verifying identity.",
    formTitle: "Deletion request form",
    name: "Name",
    phone: "MEL account phone number",
    phoneHint: "The number registered on MEL, e.g. 0770…",
    email: "Email",
    emailHint: "So we can reply to your request",
    message: "Additional notes (optional)",
    confirm:
      "I confirm I own this account and request deletion of the MEL account and its data under the policy above.",
    submit: "Submit deletion request",
    sending: "Sending…",
    successTitle: "We received your request",
    successBody:
      "We will verify the phone number, then delete the account under this policy. If we need extra confirmation, we will contact you.",
    another: "Send another request",
    privacy: "Privacy Policy",
    namePh: "Your name",
    emailPh: "you@example.com",
    messagePh: "Anything that helps us find the account",
    confirmError: "You must confirm before submitting",
    phoneRequired: "Phone number is required to identify the MEL account",
  },
};

const EMPTY = {
  name: "",
  phone: "",
  email: "",
  message: "",
  lpReference: "",
};

function DeleteAccount() {
  const [lang, setLang] = useState<Lang>("ar");
  const t = COPY[lang];
  const isAr = lang === "ar";
  const [form, setForm] = useState(EMPTY);
  const [confirmed, setConfirmed] = useState(false);
  const [phoneError, setPhoneError] = useState("");
  const [confirmError, setConfirmError] = useState("");
  const [done, setDone] = useState(false);
  const { mutate: submit, isPending } = useSubmitContact();

  useEffect(() => {
    document.title = isAr
      ? "حذف حساب MEL | MEL"
      : "Delete MEL account | MEL";
  }, [isAr]);

  const set =
    (key: keyof typeof EMPTY) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      setForm((prev) => ({ ...prev, [key]: e.target.value }));
      if (key === "phone") setPhoneError("");
    };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (isPending) return;

    const phoneErr = iqPhoneError(form.phone);
    if (phoneErr) {
      setPhoneError(form.phone.trim() ? phoneErr : t.phoneRequired);
      return;
    }
    const phone = toIqE164(form.phone);
    if (!phone) {
      setPhoneError(t.phoneRequired);
      return;
    }
    setPhoneError("");

    if (!confirmed) {
      setConfirmError(t.confirmError);
      return;
    }
    setConfirmError("");

    const note = form.message.trim();
    submit(
      {
        name: form.name.trim(),
        email: form.email.trim(),
        phone,
        subject: "MEL account deletion request",
        message: [
          "Account deletion request from https://mel.iq/delete-account",
          `Language: ${lang}`,
          note ? `Notes: ${note}` : null,
        ]
          .filter(Boolean)
          .join("\n"),
        lpReference: form.lpReference,
      },
      {
        onSuccess: (data) => {
          toast.success(
            data?.message ||
              (isAr ? "تم إرسال طلب الحذف." : "Deletion request sent."),
          );
          setDone(true);
          setForm(EMPTY);
          setConfirmed(false);
        },
        onError: (error) => {
          toast.error(
            getApiErrorMessage(
              error,
              isAr
                ? "تعذر إرسال الطلب. راسل privacy@mel.iq"
                : "Could not send the request. Email privacy@mel.iq",
            ),
          );
        },
      },
    );
  };

  return (
    <div className="px-4 py-12 sm:px-6 lg:px-8" dir={isAr ? "rtl" : "ltr"}>
      <article className="mx-auto max-w-3xl">
        <p className="text-sm font-semibold tracking-wide text-brand-primary">
          {t.eyebrow}
        </p>
        <div className="mt-3 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-3xl font-extrabold text-frost sm:text-4xl">
              {t.title}
            </h1>
            <p className="mt-2 text-sm text-muted">{t.updated}</p>
          </div>
          <div
            className="flex shrink-0 rounded-full border border-white/15 p-1"
            role="group"
            aria-label={isAr ? "لغة الصفحة" : "Page language"}
          >
            <button
              type="button"
              onClick={() => setLang("ar")}
              className={`rounded-full px-4 py-1.5 text-sm font-semibold transition-colors ${
                isAr ? "bg-white text-ink" : "text-muted hover:text-frost"
              }`}
            >
              العربية
            </button>
            <button
              type="button"
              onClick={() => setLang("en")}
              className={`rounded-full px-4 py-1.5 text-sm font-semibold transition-colors ${
                !isAr ? "bg-white text-ink" : "text-muted hover:text-frost"
              }`}
            >
              English
            </button>
          </div>
        </div>

        <p className="mt-8 text-base leading-7 text-muted">{t.intro}</p>

        <section className="mt-10">
          <h2 className="text-xl font-bold text-frost">{t.howTitle}</h2>
          <ol className="mt-3 list-decimal space-y-2 pe-5 text-base leading-7 text-muted">
            {t.how.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ol>
        </section>

        <section className="mt-10">
          <h2 className="text-xl font-bold text-frost">{t.deletedTitle}</h2>
          <ul className="mt-3 list-disc space-y-2 pe-5 text-base leading-7 text-muted">
            {t.deleted.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </section>

        <section className="mt-10">
          <h2 className="text-xl font-bold text-frost">{t.keptTitle}</h2>
          <ul className="mt-3 list-disc space-y-2 pe-5 text-base leading-7 text-muted">
            {t.kept.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </section>

        <section className="mt-10">
          <h2 className="text-xl font-bold text-frost">{t.helpTitle}</h2>
          <p className="mt-3 text-base leading-7 text-muted">{t.help}</p>
          <ul className="mt-4 space-y-2 text-base leading-7 text-muted">
            <li>
              {isAr ? "الخصوصية: " : "Privacy: "}
              <a
                href="mailto:privacy@mel.iq"
                className="text-brand-primary hover:underline"
                dir="ltr"
              >
                privacy@mel.iq
              </a>
            </li>
            <li>
              {isAr ? "الدعم: " : "Support: "}
              <a
                href="mailto:support@mel.iq"
                className="text-brand-primary hover:underline"
                dir="ltr"
              >
                support@mel.iq
              </a>
            </li>
            <li>
              <Link
                to="/privacy-policy"
                className="text-brand-primary hover:underline"
              >
                {t.privacy}
              </Link>
            </li>
          </ul>
        </section>

        <section className="mt-12 rounded-2xl border border-white/10 bg-white/[0.03] p-6 sm:p-8">
          <h2 className="text-xl font-bold text-frost">{t.formTitle}</h2>
          {done ? (
            <div className="mt-6">
              <p className="text-lg font-semibold text-frost">{t.successTitle}</p>
              <p className="mt-2 text-base leading-7 text-muted">{t.successBody}</p>
              <button
                type="button"
                onClick={() => setDone(false)}
                className="mt-6 text-sm font-semibold text-brand-primary hover:underline"
              >
                {t.another}
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="relative mt-6 space-y-5">
              <label className="flex w-full flex-col gap-1">
                <span className="text-sm font-medium text-muted">{t.name}</span>
                <input
                  name="name"
                  required
                  value={form.name}
                  onChange={set("name")}
                  placeholder={t.namePh}
                  className={INPUT}
                />
              </label>
              <label className="flex w-full flex-col gap-1">
                <span className="text-sm font-medium text-muted">{t.phone}</span>
                <input
                  name="phone"
                  required
                  inputMode="tel"
                  dir="ltr"
                  value={form.phone}
                  onChange={set("phone")}
                  placeholder="0770 000 0000"
                  className={INPUT}
                />
                <span
                  className={`text-xs ${phoneError ? "text-rose-400" : "text-muted"}`}
                >
                  {phoneError || t.phoneHint}
                </span>
              </label>
              <label className="flex w-full flex-col gap-1">
                <span className="text-sm font-medium text-muted">{t.email}</span>
                <input
                  name="email"
                  type="email"
                  required
                  dir="ltr"
                  value={form.email}
                  onChange={set("email")}
                  placeholder={t.emailPh}
                  className={INPUT}
                />
                <span className="text-xs text-muted">{t.emailHint}</span>
              </label>
              <label className="flex w-full flex-col gap-1">
                <span className="text-sm font-medium text-muted">
                  {t.message}
                </span>
                <textarea
                  name="message"
                  rows={4}
                  value={form.message}
                  onChange={set("message")}
                  placeholder={t.messagePh}
                  className={`${INPUT} resize-none`}
                />
              </label>
              <div
                aria-hidden="true"
                className="pointer-events-none absolute -left-[9999px] top-0 h-0 w-0 overflow-hidden"
              >
                <label htmlFor="delete-account-reference">
                  Do not fill
                </label>
                <input
                  id="delete-account-reference"
                  name="lpReference"
                  type="text"
                  tabIndex={-1}
                  autoComplete="off"
                  value={form.lpReference}
                  onChange={set("lpReference")}
                />
              </div>
              <label className="flex cursor-pointer items-start gap-3">
                <input
                  type="checkbox"
                  checked={confirmed}
                  onChange={(e) => {
                    setConfirmed(e.target.checked);
                    if (e.target.checked) setConfirmError("");
                  }}
                  className="mt-1 size-4 shrink-0 accent-brand-primary"
                />
                <span className="text-sm leading-6 text-muted">{t.confirm}</span>
              </label>
              {confirmError && (
                <p className="text-xs text-rose-400">{confirmError}</p>
              )}
              <button
                type="submit"
                disabled={isPending}
                className="flex w-full items-center justify-center gap-2 rounded-full bg-gradient-to-l from-brand-violet to-brand-indigo px-6 py-3.5 text-sm font-bold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isPending && <Loader2 size={16} className="animate-spin" />}
                {isPending ? t.sending : t.submit}
              </button>
            </form>
          )}
        </section>
      </article>
    </div>
  );
}

export default DeleteAccount;

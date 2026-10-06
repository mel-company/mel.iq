import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

type Lang = "ar" | "en";

type Section = {
  id: string;
  title: string;
  paragraphs: string[];
  bullets?: string[];
};

const LAST_UPDATED_AR = "6 أكتوبر 2026";
const LAST_UPDATED_EN = "6 October 2026";

const AR: { intro: string; sections: Section[] } = {
  intro:
    "تحكّم هذه الشروط استخدامك لمنصة MEL (mel.iq) والموقع والتطبيق ولوحات التحكم والمتاجر المنشأة عبرها. بإنشاء حساب أو استخدام الخدمة فإنك توافق على هذه الشروط وعلى سياسة الخصوصية.",
  sections: [
    {
      id: "who",
      title: "1. من نحن والخدمة",
      paragraphs: [
        "MEL منصة عراقية لإنشاء وإدارة المتاجر الإلكترونية ونقاط البيع، بما في ذلك المساعد الذكي، والاشتراكات، والدفع المحلي، والدومين.",
        "تنطبق هذه الشروط على موقع mel.iq وأي خدمة مرتبطة نقدّمها تحت علامة MEL.",
      ],
    },
    {
      id: "account",
      title: "2. الحساب والأهلية",
      paragraphs: [
        "يجب أن تكون قادراً قانوناً على إبرام عقد، وأن تستخدم رقماً هاتفياً عراقياً صحيحاً للتسجيل والتحقق عبر رمز OTP.",
        "أنت مسؤول عن الحفاظ على سرية جلستك وعن كل نشاط يتم عبر حسابك. أبلغنا فوراً عند اشتباهك بوصول غير مصرح به.",
      ],
    },
    {
      id: "stores",
      title: "3. متاجرك ومحتواك",
      paragraphs: [
        "تحتفظ بحقوقك في محتوى متجرك (المنتجات، الصور، النصوص، والبيانات التي تدخلها أنت أو عملاؤك).",
        "بتحميل المحتوى إلى المنصة تمنح MEL ترخيصاً محدوداً لاستضافته وعرضه وتشغيل المتجر وتقديم الدعم وتحسين الخدمة.",
      ],
      bullets: [
        "لا تنشر محتوى غير قانوني أو مضلل أو ينتهك حقوق الغير",
        "أنت المسؤول عن دقة الأسعار والمخزون والالتزامات تجاه عملائك",
        "قد نزيل أو نعلّق متجراً يخالف هذه الشروط أو القانون",
      ],
    },
    {
      id: "plans",
      title: "4. الباقات والتجربة والدفع",
      paragraphs: [
        "قد نقدّم تجربة مجانية محدودة المدة. بعد انتهائها تبدأ الفوترة وفق الباقة التي اخترتها ما لم تُلغِ الاشتراك.",
        "المدفوعات تتم عبر بوابات خارجية (مثل زين كاش وكي كارد). تخضع عملية الدفع لشروط المزود أيضاً.",
        "الأسعار والعملة والميزات المعروضة في صفحة الباقات هي المرجع وقت الشراء، وقد نحدّثها مع إشعار معقول للاشتراكات الجارية حيث يلزم.",
      ],
    },
    {
      id: "ai",
      title: "5. المساعد الذكي والرصيد",
      paragraphs: [
        "ميزات الذكاء الاصطناعي (مثل توليد المتجر أو التحويل من صوت إلى نص) تُقدَّم حسب توفر الرصيد والباقة، وقد تعتمد على مزوّدين خارجيين.",
        "المخرجات إرشادية؛ راجعها قبل النشر. MEL لا تضمن دقة أو ملاءمة المحتوى المُولَّد لاستخدامك التجاري.",
      ],
    },
    {
      id: "domains",
      title: "6. النطاقات والدومينات الفرعية",
      paragraphs: [
        "قد نوفر نطاقاً فرعياً على MEL أو نربط نطاقاً تشتريه عبر مزوّد خارجي. شراء النطاق يخضع لشروط المزوّد وسياسات التسجيل.",
        "عند إغلاق الحساب أو انتهاء الاشتراك قد يتوقف النطاق الفرعي أو الربط وفق سياسات المنصة.",
      ],
    },
    {
      id: "acceptable",
      title: "7. الاستخدام المقبول",
      paragraphs: [
        "تستخدم المنصة لأغراض مشروعة فقط. يُحظر على سبيل المثال:",
      ],
      bullets: [
        "محاولة اختراق الخدمة أو تعطيلها أو إساءة استخدام واجهاتها",
        "إرسال بريد مزعج أو احتيال أو محتوى ضار عبر متجرك",
        "انتحال هوية MEL أو طرف ثالث",
        "إعادة بيع الوصول إلى المنصة دون اتفاق مكتوب معنا",
      ],
    },
    {
      id: "availability",
      title: "8. التوفر والتعديلات",
      paragraphs: [
        "نسعى لاستقرار الخدمة لكننا لا نضمن توفراً دون انقطاع. قد نجري صيانة أو نحدّث الميزات أو نوقف جزءاً منها مع إشعار حيث أمكن.",
        "يحق لنا تعليق أو إنهاء الوصول عند مخالفة الشروط، أو عدم الدفع، أو خطر أمني.",
      ],
    },
    {
      id: "liability",
      title: "9. إخلاء المسؤولية وحدودها",
      paragraphs: [
        "تُقدَّم الخدمة «كما هي» ضمن الحدود التي يسمح بها القانون العراقي المعمول به.",
        "MEL غير مسؤولة عن خسائر غير مباشرة أو فوات أرباح أو نزاعات بينك وبين عملاء متجرك، بقدر ما يسمح به القانون.",
        "علاقتك التعاقدية مع عملاء متجرك منفصلة عن علاقتك معنا.",
      ],
    },
    {
      id: "termination",
      title: "10. الإلغاء وحذف الحساب",
      paragraphs: [
        "يمكنك إلغاء الاشتراك وفق آلية الباقة، وطلب حذف الحساب عبر صفحة حذف الحساب أو مراسلة الخصوصية.",
        "بعد الحذف قد نحتفظ بحد أدنى من السجلات إذا ألزمنا القانون أو المحاسبة بذلك، كما هو موضّح في سياسة الخصوصية.",
      ],
    },
    {
      id: "changes",
      title: "11. تحديث الشروط",
      paragraphs: [
        "قد نحدّث هذه الشروط من وقت لآخر. ننشر النسخة المحدّثة على هذه الصفحة مع تاريخ آخر تحديث. استمرارك في استخدام الخدمة بعد التحديث يعني قبولك للنسخة الجديدة.",
      ],
    },
    {
      id: "law",
      title: "12. القانون والاختصاص",
      paragraphs: [
        "تخضع هذه الشروط لقوانين جمهورية العراق، ويكون الاختصاص للمحاكم المختصة في العراق ما لم ينص القانون على خلاف ذلك.",
      ],
    },
    {
      id: "contact",
      title: "13. التواصل",
      paragraphs: [
        "للاستفسارات حول هذه الشروط راسلنا على العناوين أدناه، أو استخدم نموذج «تواصل معنا» على الموقع.",
      ],
    },
  ],
};

const EN: { intro: string; sections: Section[] } = {
  intro:
    "These Terms govern your use of the MEL platform (mel.iq), website, app, dashboards, and stores created through it. By creating an account or using the service, you agree to these Terms and to our Privacy Policy.",
  sections: [
    {
      id: "who",
      title: "1. Who we are and the service",
      paragraphs: [
        "MEL is an Iraqi platform for creating and managing online stores and point-of-sale, including AI assistance, subscriptions, local payments, and domains.",
        "These Terms apply to mel.iq and related services we offer under the MEL brand.",
      ],
    },
    {
      id: "account",
      title: "2. Account and eligibility",
      paragraphs: [
        "You must be legally able to enter a contract and use a valid Iraqi phone number for registration and OTP verification.",
        "You are responsible for keeping your session secure and for activity under your account. Notify us promptly if you suspect unauthorized access.",
      ],
    },
    {
      id: "stores",
      title: "3. Your stores and content",
      paragraphs: [
        "You retain rights in your store content (products, images, text, and data you or your customers enter).",
        "By uploading content you grant MEL a limited license to host, display, operate the store, provide support, and improve the service.",
      ],
      bullets: [
        "Do not publish illegal, misleading, or infringing content",
        "You are responsible for pricing, inventory accuracy, and obligations to your customers",
        "We may remove or suspend a store that violates these Terms or the law",
      ],
    },
    {
      id: "plans",
      title: "4. Plans, trial, and payment",
      paragraphs: [
        "We may offer a limited free trial. After it ends, billing starts for the plan you chose unless you cancel.",
        "Payments go through external gateways (such as ZainCash and Qi Card) and are also subject to the provider’s terms.",
        "Prices, currency, and features shown on the pricing page are the reference at purchase time and may change with reasonable notice where required.",
      ],
    },
    {
      id: "ai",
      title: "5. AI features and credits",
      paragraphs: [
        "AI features (such as store generation or speech-to-text) depend on available credits and plan, and may use third-party providers.",
        "Outputs are advisory; review them before publishing. MEL does not guarantee accuracy or fitness of generated content for your business.",
      ],
    },
    {
      id: "domains",
      title: "6. Domains and subdomains",
      paragraphs: [
        "We may provide a MEL subdomain or connect a domain purchased via an external registrar. Domain purchases follow the registrar’s terms.",
        "On account closure or subscription end, the subdomain or connection may stop per platform policy.",
      ],
    },
    {
      id: "acceptable",
      title: "7. Acceptable use",
      paragraphs: [
        "Use the platform only for lawful purposes. For example, you must not:",
      ],
      bullets: [
        "Attempt to hack, disrupt, or abuse the service or its APIs",
        "Send spam, fraud, or harmful content through your store",
        "Impersonate MEL or any third party",
        "Resell platform access without a written agreement with us",
      ],
    },
    {
      id: "availability",
      title: "8. Availability and changes",
      paragraphs: [
        "We aim for reliable service but do not guarantee uninterrupted availability. We may maintain, update, or discontinue features with notice where practicable.",
        "We may suspend or terminate access for Terms violations, non-payment, or security risk.",
      ],
    },
    {
      id: "liability",
      title: "9. Disclaimers and limitation of liability",
      paragraphs: [
        "The service is provided “as is” to the extent permitted by applicable Iraqi law.",
        "MEL is not liable for indirect losses, lost profits, or disputes between you and your store customers, to the extent the law allows.",
        "Your contracts with your store customers are separate from your relationship with us.",
      ],
    },
    {
      id: "termination",
      title: "10. Cancellation and account deletion",
      paragraphs: [
        "You may cancel a subscription per plan rules and request account deletion via the delete-account page or privacy email.",
        "After deletion we may retain a minimum of records where law or accounting requires, as described in the Privacy Policy.",
      ],
    },
    {
      id: "changes",
      title: "11. Changes to these Terms",
      paragraphs: [
        "We may update these Terms from time to time. We post the updated version on this page with a last-updated date. Continued use after an update means you accept the new version.",
      ],
    },
    {
      id: "law",
      title: "12. Governing law",
      paragraphs: [
        "These Terms are governed by the laws of the Republic of Iraq. Courts in Iraq have jurisdiction unless mandatory law provides otherwise.",
      ],
    },
    {
      id: "contact",
      title: "13. Contact",
      paragraphs: [
        "For questions about these Terms, email us at the addresses below, or use the contact form on the website.",
      ],
    },
  ],
};

function TermsOfUse() {
  const [lang, setLang] = useState<Lang>("ar");
  const copy = lang === "ar" ? AR : EN;
  const isAr = lang === "ar";

  useEffect(() => {
    document.title = isAr
      ? "شروط الاستخدام | MEL"
      : "Terms of Use | MEL";
  }, [isAr]);

  return (
    <div className="px-4 py-12 sm:px-6 lg:px-8" dir={isAr ? "rtl" : "ltr"}>
      <article className="mx-auto max-w-3xl">
        <p className="text-sm font-semibold tracking-wide text-brand-primary">
          {isAr ? "قانوني" : "Legal"}
        </p>
        <div className="mt-3 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-3xl font-extrabold text-frost sm:text-4xl">
              {isAr ? "شروط الاستخدام" : "Terms of Use"}
            </h1>
            <p className="mt-2 text-sm text-muted">
              {isAr ? "آخر تحديث:" : "Last updated:"}{" "}
              {isAr ? LAST_UPDATED_AR : LAST_UPDATED_EN}
            </p>
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

        <p className="mt-8 text-base leading-7 text-muted">{copy.intro}</p>

        <p className="mt-4 text-base leading-7 text-muted">
          {isAr ? "اطّلع أيضاً على " : "Also see our "}
          <Link
            to="/privacy-policy"
            className="font-semibold text-brand-primary hover:underline"
          >
            {isAr ? "سياسة الخصوصية" : "Privacy Policy"}
          </Link>
          .
        </p>

        <nav
          className="mt-8 rounded-2xl border border-white/10 bg-white/[0.03] p-5"
          aria-label={isAr ? "أقسام الشروط" : "Terms sections"}
        >
          <p className="mb-3 text-sm font-bold text-frost">
            {isAr ? "المحتويات" : "Contents"}
          </p>
          <ol className="grid gap-2 text-sm text-muted sm:grid-cols-2">
            {copy.sections.map((section) => (
              <li key={section.id}>
                <a
                  href={`#${section.id}`}
                  className="hover:text-brand-primary"
                >
                  {section.title}
                </a>
              </li>
            ))}
          </ol>
        </nav>

        <div className="mt-10 flex flex-col gap-10">
          {copy.sections.map((section) => (
            <section key={section.id} id={section.id} className="scroll-mt-28">
              <h2 className="text-xl font-bold text-frost">{section.title}</h2>
              {section.paragraphs.map((paragraph) => (
                <p
                  key={paragraph}
                  className="mt-3 text-base leading-7 text-muted"
                >
                  {paragraph}
                </p>
              ))}
              {section.id === "termination" && (
                <p className="mt-3 text-base leading-7">
                  <Link
                    to="/delete-account"
                    className="font-semibold text-brand-primary hover:underline"
                  >
                    {isAr
                      ? "افتح صفحة حذف الحساب"
                      : "Open the account deletion page"}
                  </Link>
                </p>
              )}
              {section.id === "contact" && (
                <ul className="mt-4 space-y-2 text-base leading-7 text-muted">
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
                    {isAr ? "عام: " : "General: "}
                    <a
                      href="mailto:info@mel.iq"
                      className="text-brand-primary hover:underline"
                      dir="ltr"
                    >
                      info@mel.iq
                    </a>
                  </li>
                  <li>
                    {isAr ? "الموقع: " : "Website: "}
                    <a
                      href="https://mel.iq"
                      className="text-brand-primary hover:underline"
                      dir="ltr"
                    >
                      https://mel.iq
                    </a>
                  </li>
                </ul>
              )}
              {section.bullets && (
                <ul className="mt-3 list-disc space-y-2 pe-5 text-base leading-7 text-muted">
                  {section.bullets.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              )}
            </section>
          ))}
        </div>
      </article>
    </div>
  );
}

export default TermsOfUse;

import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

type Lang = "ar" | "en";

type Section = {
  id: string;
  title: string;
  paragraphs: string[];
  bullets?: string[];
};

const LAST_UPDATED_AR = "26 سبتمبر 2026";
const LAST_UPDATED_EN = "26 September 2026";

const AR: { intro: string; sections: Section[] } = {
  intro:
    "تحترم MEL (المشغّلة لمنصة mel.iq) خصوصيتك. توضّح هذه السياسة البيانات التي نجمعها عبر الموقع الإلكتروني وتطبيق MEL ولوحة التحكم والمتاجر المنشأة على المنصة، وكيف نستخدمها، ومع من نشاركها، وكيف يمكنك طلب الوصول إليها أو حذفها.",
  sections: [
    {
      id: "who",
      title: "1. من نحن",
      paragraphs: [
        "MEL هي منصة عراقية لإنشاء وإدارة المتاجر الإلكترونية ونقاط البيع، بما في ذلك المساعد الذكي لتوليد المتجر، والاشتراكات، والدفع، والدومين.",
        "تنطبق هذه السياسة على موقع mel.iq، ولوحات التحكم، وتطبيق MEL على الأجهزة المحمولة إن وُجد، وأي خدمة مرتبطة نقدّمها تحت علامة MEL.",
      ],
    },
    {
      id: "account",
      title: "2. معلومات الحساب ورقم الهاتف",
      paragraphs: [
        "التسجيل وتسجيل الدخول يعتمدان على رقم الهاتف العراقي ورمز تحقق (OTP) يُرسل إلى هاتفك. قد نطلب أيضاً الاسم والبريد الإلكتروني عند إنشاء الحساب أو الاشتراك.",
      ],
      bullets: [
        "رقم الهاتف (بصيغة دولية) لأغراض الحساب والتحقق",
        "الاسم والبريد الإلكتروني إن قدّمتهما",
        "رمز التحقق لمرة واحدة، ولا نستخدمه بعد إتمام التحقق",
        "بيانات الجلسة (مثل رمز الدخول) على جهازك لإبقائك مسجّلاً",
      ],
    },
    {
      id: "store",
      title: "3. بيانات المتاجر والمنتجات والطلبات",
      paragraphs: [
        "عند إنشاء متجر أو إدارته، نعالج البيانات اللازمة لتشغيل المتجر وخدمة عملائك، بما في ذلك ما يُنشأ عبر المساعد الذكي.",
      ],
      bullets: [
        "اسم المتجر، الوصف، الشعار، الدومين، وروابط التواصل الاجتماعي",
        "المنتجات، الأسعار، المخزون، والصور",
        "الطلبات وبيانات العملاء التي يدخلها المتجر أو عملاؤه على واجهة المتجر",
        "سجل الاشتراك والباقة وحالة المتجر",
      ],
    },
    {
      id: "location",
      title: "4. الموقع الجغرافي",
      paragraphs: [
        "لا يطلب MEL حالياً إذن الموقع الدقيق (GPS)، ولا نتتبّع موقع جهازك في الخلفية أو أثناء الاستخدام عبر خدمات تحديد المواقع.",
        "قد تدخل عنواناً أو محافظة كنص عند إعداد المتجر أو الحساب. قد يُستنتج موقع تقريبي من عنوان IP لأغراض الأمان ومنع الاحتيال وتشغيل الشبكة، وليس لتتبعك على الخريطة.",
      ],
    },
    {
      id: "notifications",
      title: "5. الإشعارات",
      paragraphs: [
        "لا يستخدم MEL حالياً إشعارات الدفع عبر Firebase Cloud Messaging (FCM) أو خدمات مشابهة داخل هذا المنتج.",
        "قد نراسلك عبر رقم الهاتف أو البريد الإلكتروني بخصوص الحساب، والدفع، والدعم، والتحديثات المهمة للخدمة. إذا أضفنا إشعارات الدفع لاحقاً، سنحدّث هذه السياسة ونطلب الإذن من نظام التشغيل حيث يلزم.",
      ],
    },
    {
      id: "media",
      title: "6. الصور والملفات والصوت",
      paragraphs: [
        "يمكنك رفع شعار المتجر، وصور المنتجات، وصور مرجعية أو هوية بصرية للمساعد الذكي. تُخزَّن الملفات على بنية الاستضافة الخاصة بنا (بما في ذلك Cloudflare R2).",
        "عند استخدام الإدخال الصوتي في المساعد الذكي، يُستخدم الميكروفون فقط بعد موافقتك وبمبادرتك، لتحويل الكلام إلى نص ثم إيقاف الالتقاط. لا نسجّل المكالمات ولا نلتقط الصوت في الخلفية.",
      ],
    },
    {
      id: "payments",
      title: "7. بيانات الدفع",
      paragraphs: [
        "الاشتراكات، وتجديد الباقة، وشراء الدومين، وشحن رصيد الذكاء الاصطناعي تتم عبر بوابات دفع خارجية، حالياً زين كاش (ZainCash) وكي كارد (Qi Card).",
        "نُنشئ عملية دفع ونحوّلك إلى صفحة المزود. لا نخزّن رقم البطاقة الكامل ولا رمز CVV على خوادمنا. نحتفظ بمعرّف العملية، والمبلغ، والعملة، والحالة (مثل قيد الانتظار أو مدفوع أو فاشل)، ومزوّد الدفع لإتمام الاشتراك أو الشحن ومعالجة الدعم والمحاسبة.",
      ],
    },
    {
      id: "third-parties",
      title: "8. خدمات الطرف الثالث والاستضافة",
      paragraphs: [
        "لا يستخدم MEL حالياً Firebase Analytics أو Firebase Crashlytics أو FCM.",
        "نعتمد على مزوّدين لتشغيل الخدمة، ويعالجون البيانات بالقدر اللازم لتقديمها:",
      ],
      bullets: [
        "الاستضافة وشبكة التوصيل وأمن المواقع (بما في ذلك Cloudflare)",
        "تخزين الملفات على Cloudflare R2",
        "بوابات الدفع: زين كاش وكي كارد",
        "تسجيل النطاقات عبر مزوّد الدومين عند شراء نطاق",
        "خدمات الذكاء الاصطناعي لتوليد المتجر أو التحويل من صوت إلى نص عندما تستخدم هذه الميزات",
      ],
    },
    {
      id: "use",
      title: "9. كيف نستخدم البيانات",
      paragraphs: ["نستخدم البيانات للأغراض التالية:"],
      bullets: [
        "إنشاء الحساب والتحقق منه وإبقائك مسجّلاً",
        "تشغيل المتجر والاشتراك والدومين ورصيد الذكاء الاصطناعي",
        "معالجة المدفوعات وتأكيد حالتها",
        "الدعم الفني والرد على طلبات التواصل",
        "الأمان، ومنع الاحتيال، والامتثال القانوني",
        "تحسين الخدمة وإصلاح الأعطال بالقدر اللازم لتشغيل المنصة",
      ],
    },
    {
      id: "sharing",
      title: "10. مشاركة البيانات",
      paragraphs: [
        "لا نبيع بياناتك الشخصية. نشاركها فقط عند الحاجة لتشغيل MEL أو عند وجود التزام قانوني:",
      ],
      bullets: [
        "مزوّدو الدفع والدومين والاستضافة والذكاء الاصطناعي لتنفيذ طلبك",
        "السلطات المختصة إذا طُلب ذلك قانوناً",
        "ما يظهر علناً على واجهة متجرك بناءً على إعداداتك (مثل اسم المتجر والمنتجات)",
      ],
    },
    {
      id: "security",
      title: "11. حماية البيانات",
      paragraphs: [
        "نستخدم اتصالاً مشفّراً (HTTPS)، وتوكناً للمصادقة، وضوابط وصول، واستضافة محمية. لا توجد وسيلة إلكترونية آمنة بالكامل؛ نتخذ إجراءات معقولة لحماية البيانات من الوصول أو التغيير أو الإفشاء غير المصرّح به.",
      ],
    },
    {
      id: "retention",
      title: "12. الاحتفاظ بالبيانات وحذف الحساب",
      paragraphs: [
        "نحتفظ بالبيانات طالما الحساب أو المتجر نشط، ثم للمدة اللازمة للمحاسبة والدعم والالتزامات القانونية.",
        "يمكنك من داخل المنصة إلغاء الاشتراك وحذف المتجر. الحذف حالياً حذف ناعم، ويمكن استرجاع المتجر خلال 30 يوماً قبل الحذف النهائي.",
        "لا يتوفر حالياً زر لحذف حساب المستخدم بالكامل من داخل التطبيق. لطلب حذف حسابك وبياناتك الشخصية استخدم صفحة حذف الحساب: https://mel.iq/delete-account أو راسلنا على البريد أدناه. قد نحتفظ بحد أدنى من السجلات إذا ألزمنا القانون بذلك (مثل سجلات الدفع).",
      ],
    },
    {
      id: "rights",
      title: "13. حقوقك",
      paragraphs: [
        "يمكنك طلب الوصول إلى بياناتك، أو تصحيحها، أو حذفها، أو الاستفسار عن كيفية معالجتها، عبر مراسلتنا. سنتحقق من هويتك قبل تنفيذ الطلب.",
      ],
    },
    {
      id: "children",
      title: "14. خصوصية الأطفال",
      paragraphs: [
        "MEL خدمة مخصّصة لأصحاب الأعمال والتجار، وليست موجّهة لمن هم دون 18 عاماً. لا نجمع عن علم بيانات أطفال. إذا علمنا بجمع بيانات لقاصر، سنحذفها. إن كنت ولي أمر وتعتقد أن قاصراً استخدم الخدمة، تواصل معنا.",
      ],
    },
    {
      id: "updates",
      title: "15. تحديثات سياسة الخصوصية",
      paragraphs: [
        "قد نحدّث هذه السياسة عند تغيّر الخدمة أو المتطلبات القانونية. تاريخ «آخر تحديث» أعلى الصفحة هو المرجع. استمرار استخدام MEL بعد النشر يعني الاطلاع على النسخة المحدَّثة. للتغييرات الجوهرية قد نُعلمك عبر الموقع أو التطبيق أو وسيلة التواصل المسجّلة.",
      ],
    },
    {
      id: "contact",
      title: "16. التواصل مع MEL",
      paragraphs: [
        "لطلبات الخصوصية أو حذف البيانات أو الاستفسارات راسلنا على العناوين أدناه، أو استخدم نموذج «تواصل معنا» على الموقع.",
      ],
    },
  ],
};

const EN: { intro: string; sections: Section[] } = {
  intro:
    "MEL (the operator of the mel.iq platform) respects your privacy. This policy explains what data we collect through the website, the MEL app, dashboards, and stores created on the platform; how we use it; who we share it with; and how you can access or delete it.",
  sections: [
    {
      id: "who",
      title: "1. Who we are",
      paragraphs: [
        "MEL is an Iraqi platform for creating and managing online stores and point of sale, including an AI store generator, subscriptions, payments, and domains.",
        "This policy applies to mel.iq, merchant dashboards, the MEL mobile application if offered, and related services we provide under the MEL brand.",
      ],
    },
    {
      id: "account",
      title: "2. Account information and phone number",
      paragraphs: [
        "Sign-up and sign-in use an Iraqi mobile number and a one-time passcode (OTP) sent to your phone. We may also collect your name and email when you create an account or subscribe.",
      ],
      bullets: [
        "Phone number (international format) for the account and verification",
        "Name and email if you provide them",
        "One-time verification codes, which are not reused after verification",
        "Session data (such as an access token) on your device to keep you signed in",
      ],
    },
    {
      id: "store",
      title: "3. Store, product, and order data",
      paragraphs: [
        "When you create or manage a store, we process the data needed to run the store and serve your customers, including content generated with the AI assistant.",
      ],
      bullets: [
        "Store name, description, logo, domain, and social links",
        "Products, prices, inventory, and images",
        "Orders and customer details entered by the merchant or shoppers on the storefront",
        "Subscription, plan, and store status records",
      ],
    },
    {
      id: "location",
      title: "4. Location",
      paragraphs: [
        "MEL does not currently request precise geolocation (GPS) and does not track your device in the background or in the foreground via location services.",
        "You may enter an address or governorate as text when setting up a store or account. An approximate location may be inferred from IP address for security, fraud prevention, and network operation — not to map your movements.",
      ],
    },
    {
      id: "notifications",
      title: "5. Notifications",
      paragraphs: [
        "MEL does not currently use push notifications via Firebase Cloud Messaging (FCM) or similar services in this product.",
        "We may contact you by phone or email about your account, payments, support, and important service updates. If we add push notifications later, we will update this policy and request the relevant operating-system permission.",
      ],
    },
    {
      id: "media",
      title: "6. Photos, files, and audio",
      paragraphs: [
        "You may upload a store logo, product images, and reference or brand-kit images for the AI generator. Files are stored on our hosting infrastructure (including Cloudflare R2).",
        "If you use voice input in the AI assistant, the microphone is used only after you start recording, to transcribe speech to text, then capture stops. We do not record calls or capture audio in the background.",
      ],
    },
    {
      id: "payments",
      title: "7. Payment data",
      paragraphs: [
        "Subscriptions, plan renewals, domain purchases, and AI credit top-ups are processed through third-party payment gateways, currently ZainCash and Qi Card.",
        "We create a payment and redirect you to the provider’s page. We do not store full card numbers or CVV on our servers. We retain the payment identifier, amount, currency, status (for example pending, paid, or failed), and provider so we can complete the subscription or top-up and handle support and accounting.",
      ],
    },
    {
      id: "third-parties",
      title: "8. Third-party services and hosting",
      paragraphs: [
        "MEL does not currently use Firebase Analytics, Firebase Crashlytics, or FCM.",
        "We rely on processors to run the service. They handle data only as needed to provide it:",
      ],
      bullets: [
        "Hosting, content delivery, and site security (including Cloudflare)",
        "File storage on Cloudflare R2",
        "Payment gateways: ZainCash and Qi Card",
        "Domain registration providers when you buy a domain",
        "AI providers for store generation or speech-to-text when you use those features",
      ],
    },
    {
      id: "use",
      title: "9. How we use data",
      paragraphs: ["We use data to:"],
      bullets: [
        "Create and verify your account and keep you signed in",
        "Operate the store, subscription, domain, and AI credits",
        "Process payments and confirm their status",
        "Provide support and respond to contact requests",
        "Protect security, prevent fraud, and meet legal duties",
        "Improve and debug the service as needed to run the platform",
      ],
    },
    {
      id: "sharing",
      title: "10. Sharing",
      paragraphs: [
        "We do not sell your personal data. We share it only as needed to operate MEL or as required by law:",
      ],
      bullets: [
        "Payment, domain, hosting, and AI providers to fulfil your request",
        "Competent authorities where legally required",
        "Information you choose to publish on your storefront (such as store name and products)",
      ],
    },
    {
      id: "security",
      title: "11. Security",
      paragraphs: [
        "We use encrypted connections (HTTPS), authentication tokens, access controls, and protected hosting. No electronic system is completely secure; we take reasonable steps to protect data against unauthorised access, alteration, or disclosure.",
      ],
    },
    {
      id: "retention",
      title: "12. Retention and account deletion",
      paragraphs: [
        "We keep data while your account or store is active, and thereafter as needed for accounting, support, and legal obligations.",
        "In the product you can cancel a subscription and delete a store. Deletion is currently a soft delete; the store can be restored for 30 days before permanent removal.",
        "There is currently no in-app control to delete the user account entirely. To request deletion of your account and personal data, use https://mel.iq/delete-account or email us at the address below. We may retain a minimum of records where the law requires it (for example payment records).",
      ],
    },
    {
      id: "rights",
      title: "13. Your rights",
      paragraphs: [
        "You may request access to, correction of, or deletion of your data, or ask how it is processed, by contacting us. We will verify your identity before fulfilling the request.",
      ],
    },
    {
      id: "children",
      title: "14. Children’s privacy",
      paragraphs: [
        "MEL is a business service for merchants and is not directed at anyone under 18. We do not knowingly collect children’s data. If we learn that we have collected data from a minor, we will delete it. If you are a parent or guardian and believe a minor used the service, contact us.",
      ],
    },
    {
      id: "updates",
      title: "15. Changes to this policy",
      paragraphs: [
        "We may update this policy when the service or legal requirements change. The “Last updated” date at the top is the reference. Continued use of MEL after publication means you have had the opportunity to review the updated version. For material changes we may notify you via the site, the app, or your registered contact method.",
      ],
    },
    {
      id: "contact",
      title: "16. Contact MEL",
      paragraphs: [
        "For privacy requests, data deletion, or questions, email us at the addresses below, or use the contact form on the website.",
      ],
    },
  ],
};

function PrivacyPolicy() {
  const [lang, setLang] = useState<Lang>("ar");
  const copy = lang === "ar" ? AR : EN;
  const isAr = lang === "ar";

  useEffect(() => {
    document.title = isAr
      ? "سياسة الخصوصية | MEL"
      : "Privacy Policy | MEL";
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
              {isAr ? "سياسة الخصوصية" : "Privacy Policy"}
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

        <nav
          className="mt-8 rounded-2xl border border-white/10 bg-white/[0.03] p-5"
          aria-label={isAr ? "أقسام السياسة" : "Policy sections"}
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
              {section.id === "retention" && (
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

export default PrivacyPolicy;

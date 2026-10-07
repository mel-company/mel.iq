/**
 * Shared landing FAQ — used by FaqSection UI and FAQPage JSON-LD.
 *
 * These answers are published as structured data, so a wrong one is indexed and
 * quotable. Two were: a 14-day trial that does not exist (the offer is one free
 * month, then six at half price — `MONTHLY_PROMO` in the server's
 * `plan-catalog.ts`), and credit cards and bank transfers the platform cannot
 * take. Only ZainCash and QiCard are implemented.
 */
export const LANDING_FAQS = [
  {
    question: "هل هناك عرض للبداية؟",
    answer:
      "الشهر الأول مجاني، ثم 6 أشهر بنصف السعر، ثم السعر الكامل. العرض مرة واحدة لكل حساب وعلى الفوترة الشهرية.",
  },
  {
    question: "هل يمكنني تغيير الباقة لاحقاً؟",
    answer:
      "نعم، يمكنك ترقية باقتك أو خفضها في أي وقت، والتغييرات سارية فوراً.",
  },
  {
    question: "ما طرق الدفع المقبولة؟",
    answer:
      "نقبل الدفع عبر زين كاش وكي كارد. تُعرض الطرق المتاحة فعلياً في صفحة الدفع.",
  },
  {
    question: "هل يمكنني الإلغاء في أي وقت؟",
    answer:
      "نعم، يمكنك إلغاء اشتراكك في أي وقت. لا توجد رسوم إلغاء أو غرامات.",
  },
  {
    question: "كيف أنشئ متجري على ميل؟",
    answer:
      "اكتب وصفاً لمتجرك في مربع الأعلى، وسيقوم المساعد الذكي بتوليد المتجر بمنتجاته وصفحاته وهويته، ثم تحرّره كما تشاء قبل النشر.",
  },
  {
    question: "هل أحتاج خبرة برمجية لإدارة المتجر؟",
    answer:
      "لا. كل شيء يُدار من لوحة تحكم عربية: المنتجات، الطلبات، المخزون، والعروض — بدون كتابة سطر واحد من الكود.",
  },
  {
    question: "كيف يعمل المساعد الذكي؟",
    answer:
      "تطلب منه ما تريد بالعربية — تقرير مبيعات، إضافة خصم، متابعة طلب — وينفّذه داخل متجرك مباشرة بدل أن تبحث عن الإعداد بنفسك.",
  },
] as const;

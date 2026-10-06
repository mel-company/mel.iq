import { Link } from "react-router-dom";
import { MarketingShell } from "../../components/LandingNavbar";
import SectionEyebrow from "../../components/landing/SectionEyebrow";
import SeoHead, {
  breadcrumbSchema,
  faqSchema,
  softwareApplicationSchema,
} from "../../seo/SeoHead";
import { getTopic, SEO_TOPICS } from "../../seo/topics";
import type { SeoTopic } from "../../seo/types";

function topicHref(slug: string) {
  if (slug === "pricing") return "/pricing";
  return `/${slug}`;
}

function topicLabel(slug: string) {
  if (slug === "pricing") return "الباقات والأسعار";
  return getTopic(slug)?.title.split("—")[0]?.trim() || slug;
}

function TopicBody({ topic }: { topic: SeoTopic }) {
  const schemas = [
    breadcrumbSchema([
      { name: "ميل", path: "/" },
      { name: topic.eyebrow, path: `/${topic.slug}` },
    ]),
    faqSchema(topic.faqs),
    {
      "@context": "https://schema.org",
      "@type": "WebPage",
      name: topic.title,
      description: topic.description,
      url: `https://www.mel.iq/${topic.slug}`,
      isPartOf: {
        "@type": "WebSite",
        name: "Mel IQ",
        url: "https://www.mel.iq/",
      },
      inLanguage: "ar-IQ",
    },
    softwareApplicationSchema(),
  ];

  return (
    <>
      <SeoHead
        title={topic.documentTitle}
        description={topic.description}
        path={`/${topic.slug}`}
        schemas={schemas}
      />

      <article className="relative overflow-x-clip px-4 pb-20 pt-10 sm:px-6 lg:pb-28 lg:pt-16">
        <div aria-hidden className="pointer-events-none absolute inset-0">
          <div className="absolute -start-1/4 top-0 size-[640px] rounded-full bg-[#1b1147]/50 blur-[150px]" />
        </div>

        <div className="relative mx-auto max-w-[900px]">
          <nav aria-label="مسار التنقل" className="mb-8 text-sm text-muted">
            <ol className="flex flex-wrap items-center gap-2">
              <li>
                <Link to="/" className="hover:text-frost">
                  الرئيسية
                </Link>
              </li>
              <li aria-hidden>/</li>
              <li className="text-frost">{topic.eyebrow}</li>
            </ol>
          </nav>

          <header className="mb-12 flex flex-col items-start gap-6 text-right">
            <SectionEyebrow align="start" as="p">{topic.eyebrow}</SectionEyebrow>
            <h1 className="text-display max-w-[20ch]">{topic.title}</h1>
            {topic.intro.map((p) => (
              <p key={p.slice(0, 24)} className="text-prose-lg max-w-[720px]">
                {p}
              </p>
            ))}
            <div className="flex flex-wrap gap-3">
              <Link
                to="/checkout"
                className="flex h-14 items-center justify-center rounded-[18px] bg-[linear-gradient(90deg,#4f60f9_0%,#7569ff_100%)] px-6 text-base font-bold text-white transition-opacity hover:opacity-90"
              >
                ابدأ متجرك الآن
              </Link>
              <Link
                to="/pricing"
                className="flex h-14 items-center justify-center rounded-[18px] border border-white/15 px-6 text-base text-white transition-colors hover:bg-white/5"
              >
                عرض الباقات
              </Link>
            </div>
          </header>

          <div className="flex flex-col gap-12">
            {topic.sections.map((section) => (
              <section key={section.heading} className="text-right">
                <h2 className="mb-4 text-2xl font-bold text-frost sm:text-3xl">
                  {section.heading}
                </h2>
                {section.body.map((p) => (
                  <p key={p.slice(0, 28)} className="text-prose-lg mb-3">
                    {p}
                  </p>
                ))}
              </section>
            ))}
          </div>

          <section className="mt-16 text-right">
            <h2 className="mb-6 text-2xl font-bold text-frost">أسئلة شائعة</h2>
            <div className="flex flex-col gap-4">
              {topic.faqs.map((faq) => (
                <div
                  key={faq.question}
                  className="rounded-[14px] bg-ink-panel p-5"
                >
                  <h3 className="mb-2 text-base font-bold text-frost">
                    {faq.question}
                  </h3>
                  <p className="text-sm leading-7 text-muted">{faq.answer}</p>
                </div>
              ))}
            </div>
          </section>

          <section className="mt-16 text-right">
            <h2 className="mb-4 text-xl font-bold text-frost">مواضيع ذات صلة</h2>
            <ul className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
              {topic.related.map((slug) => (
                <li key={slug}>
                  <Link
                    to={topicHref(slug)}
                    className="inline-flex rounded-full border border-white/10 px-4 py-2 text-sm text-muted transition-colors hover:border-brand-primary/40 hover:text-frost"
                  >
                    {topicLabel(slug)}
                  </Link>
                </li>
              ))}
            </ul>
          </section>

          <aside className="mt-16 rounded-[18px] border border-white/10 bg-white/[0.03] p-8 text-center">
            <p className="text-prose-lg mb-6">
              جاهز تحوّل فكرتك إلى متجر إلكتروني عراقي منظم؟
            </p>
            <Link
              to="/checkout"
              className="inline-flex h-14 items-center justify-center rounded-[18px] bg-[linear-gradient(90deg,#4f60f9_0%,#7569ff_100%)] px-8 text-base font-bold text-white"
            >
              أنشئ حسابك على ميل
            </Link>
          </aside>
        </div>
      </article>
    </>
  );
}

/** One SEO topic page, resolved by slug from the registry. */
function SeoTopicPage({ slug }: { slug: string }) {
  const topic = getTopic(slug);
  if (!topic) {
    return (
      <MarketingShell>
        <div className="px-6 py-24 text-center text-frost">الصفحة غير موجودة</div>
      </MarketingShell>
    );
  }

  return (
    <MarketingShell>
      <TopicBody topic={topic} />
    </MarketingShell>
  );
}

/** Hub index of all SEO guides for crawl discovery + humans. */
export function SeoGuidesIndex() {
  const schemas = [
    breadcrumbSchema([
      { name: "ميل", path: "/" },
      { name: "أدلة التجارة الإلكترونية", path: "/guides" },
    ]),
    {
      "@context": "https://schema.org",
      "@type": "CollectionPage",
      name: "أدلة التجارة الإلكترونية في العراق",
      url: "https://www.mel.iq/guides",
      inLanguage: "ar-IQ",
    },
  ];

  return (
    <MarketingShell>
      <SeoHead
        title="أدلة التجارة الإلكترونية في العراق | Mel IQ"
        description="أدلة ميل لإنشاء متجر إلكتروني، POS، المخزون، زين كاش، والدفع الإلكتروني في العراق."
        path="/guides"
        schemas={schemas}
      />
      <div className="mx-auto max-w-[900px] px-4 py-16 sm:px-6">
        <SectionEyebrow as="p">أدلة ميل</SectionEyebrow>
        <h1 className="text-display mt-6 mb-4 text-right">
          أدلة التجارة الإلكترونية في العراق
        </h1>
        <p className="text-prose-lg mb-10 text-right">
          صفحات عملية تشرح كيف تطلق وتدير متجرك مع ميل — مرتبطة ببعضها لتغطية السوق العراقي.
        </p>
        <ul className="flex flex-col gap-3">
          {SEO_TOPICS.map((topic) => (
            <li key={topic.slug}>
              <Link
                to={`/${topic.slug}`}
                className="block rounded-[14px] border border-white/10 bg-ink-panel px-5 py-4 text-right transition-colors hover:border-brand-primary/30"
              >
                <span className="block text-base font-bold text-frost">
                  {topic.title}
                </span>
                <span className="mt-1 block text-sm text-muted">
                  {topic.description}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </MarketingShell>
  );
}

export default SeoTopicPage;

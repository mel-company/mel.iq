import { useEffect } from "react";

const SITE = "https://www.mel.iq";
const DEFAULT_IMAGE = `${SITE}/og-image.jpg`;

function upsertMeta(
  attr: "name" | "property",
  key: string,
  content: string,
) {
  let el = document.head.querySelector<HTMLMetaElement>(
    `meta[${attr}="${key}"]`,
  );
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.content = content;
}

function upsertLink(rel: string, href: string) {
  let el = document.head.querySelector<HTMLLinkElement>(
    `link[rel="${rel}"]`,
  );
  if (!el) {
    el = document.createElement("link");
    el.rel = rel;
    document.head.appendChild(el);
  }
  el.href = href;
}

function upsertJsonLd(id: string, data: Record<string, unknown> | Record<string, unknown>[]) {
  let el = document.getElementById(id) as HTMLScriptElement | null;
  if (!el) {
    el = document.createElement("script");
    el.type = "application/ld+json";
    el.id = id;
    document.head.appendChild(el);
  }
  el.textContent = JSON.stringify(data);
}

export type SeoHeadProps = {
  title: string;
  description: string;
  path: string;
  ogTitle?: string;
  ogType?: string;
  image?: string;
  noindex?: boolean;
  schemas?: Array<Record<string, unknown>>;
};

/**
 * Per-route title, description, canonical, Open Graph, and JSON-LD.
 * Runs client-side; pair with sitemap + real HTML content so crawlers that
 * execute JS (Google) and those that read static shells both get signals.
 */
function SeoHead({
  title,
  description,
  path,
  ogTitle,
  ogType = "website",
  image = DEFAULT_IMAGE,
  noindex = false,
  schemas = [],
}: SeoHeadProps) {
  useEffect(() => {
    const url = path.startsWith("http")
      ? path
      : `${SITE}${path.startsWith("/") ? path : `/${path}`}`;
    const cleanPath = url.replace(/\/$/, "") || SITE;
    const canonical = cleanPath === SITE ? `${SITE}/` : cleanPath;

    document.title = title;
    upsertMeta("name", "description", description);
    upsertMeta(
      "name",
      "robots",
      noindex ? "noindex, nofollow" : "index, follow",
    );
    upsertLink("canonical", canonical);

    upsertMeta("property", "og:type", ogType);
    upsertMeta("property", "og:site_name", "Mel IQ");
    upsertMeta("property", "og:url", canonical);
    upsertMeta("property", "og:title", ogTitle || title);
    upsertMeta("property", "og:description", description);
    upsertMeta("property", "og:image", image);
    upsertMeta("property", "og:locale", "ar_IQ");

    upsertMeta("name", "twitter:card", "summary_large_image");
    upsertMeta("name", "twitter:url", canonical);
    upsertMeta("name", "twitter:title", ogTitle || title);
    upsertMeta("name", "twitter:description", description);
    upsertMeta("name", "twitter:image", image);

    if (schemas.length > 0) {
      upsertJsonLd("mel-seo-jsonld", schemas.length === 1 ? schemas[0] : schemas);
    }
  }, [title, description, path, ogTitle, ogType, image, noindex, schemas]);

  return null;
}

export function breadcrumbSchema(
  items: Array<{ name: string; path: string }>,
) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: item.name,
      item: `${SITE}${item.path.startsWith("/") ? item.path : `/${item.path}`}`,
    })),
  };
}

export function faqSchema(faqs: Array<{ question: string; answer: string }>) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((f) => ({
      "@type": "Question",
      name: f.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: f.answer,
      },
    })),
  };
}

export function softwareApplicationSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "Mel IQ",
    applicationCategory: "BusinessApplication",
    operatingSystem: "Web, iOS, Android",
    url: `${SITE}/`,
    description:
      "منصة عراقية لإنشاء وإدارة المتاجر الإلكترونية ونقاط البيع مع مساعد ذكي بالعربية.",
    offers: {
      "@type": "Offer",
      priceCurrency: "IQD",
      availability: "https://schema.org/InStock",
      url: `${SITE}/pricing`,
    },
    inLanguage: "ar",
    publisher: {
      "@type": "Organization",
      name: "Mel IQ",
      url: SITE,
    },
  };
}

export default SeoHead;

export type SeoFaq = { question: string; answer: string };

export type SeoTopic = {
  /** URL path without leading slash, e.g. `ecommerce-iraq` */
  slug: string;
  /** Arabic H1 */
  title: string;
  /** <title> tag */
  documentTitle: string;
  description: string;
  /** Short eyebrow above H1 */
  eyebrow: string;
  /** Primary keyword cluster for humans + internal notes */
  keywords: string[];
  /** Intro paragraphs under H1 */
  intro: string[];
  sections: Array<{
    heading: string;
    body: string[];
  }>;
  faqs: SeoFaq[];
  /** Related topic slugs for internal linking */
  related: string[];
  /** Schema type hint */
  schemaType?: "WebPage" | "SoftwareApplication" | "Product";
  priority?: number;
};

export type SeoRouteMeta = {
  path: string;
  documentTitle: string;
  description: string;
  ogTitle?: string;
  noindex?: boolean;
  schemas?: Record<string, unknown>[];
};

import { writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const SITE = "https://www.mel.iq";

/** Keep in sync with `src/seo/topics.ts` slugs. */
const TOPIC_SLUGS = [
  ["ecommerce-iraq", "0.95"],
  ["create-online-store", "0.94"],
  ["ecommerce-platform", "0.90"],
  ["store-management", "0.88"],
  ["pos-iraq", "0.92"],
  ["inventory-management", "0.87"],
  ["online-payment-iraq", "0.91"],
  ["zain-cash", "0.90"],
  ["qi-payment", "0.86"],
  ["mobile-commerce", "0.88"],
  ["ai-ecommerce", "0.89"],
];

const STATIC = [
  ["/", "1.00"],
  ["/pricing", "0.90"],
  ["/guides", "0.92"],
  ["/about", "0.70"],
  ["/contact", "0.70"],
  ["/templates", "0.75"],
  ["/privacy-policy", "0.30"],
];

const today = new Date().toISOString().slice(0, 10);
const urls = [
  ...STATIC,
  ...TOPIC_SLUGS.map(([slug, priority]) => [`/${slug}`, priority]),
];

const body = urls
  .map(
    ([path, priority]) => `  <url>
    <loc>${SITE}${path}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>${priority}</priority>
  </url>`,
  )
  .join("\n\n");

const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${body}
</urlset>
`;

writeFileSync(resolve(__dirname, "../public/sitemap.xml"), xml, "utf8");
console.log(`Wrote ${urls.length} URLs to public/sitemap.xml`);

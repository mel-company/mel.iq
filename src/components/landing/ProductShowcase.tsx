import { ArrowUpRight, Pencil, Star, Trash2 } from "../icons";

/**
 * The two storefront decks: "أكتشف أفضل المنتجات" and the discounts rail
 * beneath it. Both are the same light product card — a sample of what a store
 * built on the platform looks like — scrolling past a heading block.
 */

type Product = {
  image: string;
  rating: string;
  /** In RTL reading order — rightmost pill first. */
  tags: string[];
  name: string;
  blurb: string;
  /** Direction the discount figure points; green up, red down. */
  trend: "up" | "down";
  was: string;
  now: string;
};

const PRODUCTS: Product[] = [
  {
    image: "/images/landing/product-charger.png",
    rating: "4.8",
    tags: ["قيمنق", "كيبوردات", "بلايستيشن 5"],
    name: "شاحن متنقل 20000 مللي أمبير شحن سريع",
    blurb: "شحن سريع بقوة 65 واط مع منفذين USB-C يشحن اللابتوب والهاتف في وقت واحد",
    trend: "up",
    was: "61,500",
    now: "52,000",
  },
  {
    image: "/images/landing/product-earbuds.png",
    rating: "4.8",
    tags: ["قيمنق", "كيبوردات", "بلايستيشن 5"],
    name: "سماعات لاسلكية بلوتوث 5.3 مع إلغاء الضوضاء",
    blurb: "تقنية إلغاء الضوضاء النشطة توفر تجربة صوتية غامرة مع بطارية تدوم حتى 30 ساعة",
    trend: "down",
    was: "102,000",
    now: "89,000",
  },
  {
    image: "/images/landing/product-watch.png",
    rating: "4.6",
    tags: ["شاومي", "ساعات ذكية"],
    name: "ساعة ذكية مع شاشة AMOLED ومقاومة للماء",
    blurb: "شاشة عالية الوضوح مع تتبع اللياقة البدنية ومراقبة معدل ضربات القلب على مدار الساعة",
    trend: "down",
    was: "145,000",
    now: "125,000",
  },
  {
    image: "/images/landing/product-speaker.png",
    rating: "4.9",
    tags: ["مكبرات صوت"],
    name: "مكبر صوت بلوتوث محمول مقاوم للماء",
    blurb: "صوت قوي بتقنية JBL Pro مع مقاومة IP67 للماء والغبار وبطارية تدوم 20 ساعة",
    trend: "up",
    was: "79,000",
    now: "67,500",
  },
];

/** The merchant badge that overlaps every card's title row. */
function VendorBadge() {
  return (
    <span className="relative flex size-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-brand-secondary to-brand-primary">
      <span className="absolute inset-[18%] rounded-full bg-gradient-to-br from-brand-primary to-brand-secondary" />
      <span className="relative text-[9px] font-extrabold text-white">3P</span>
    </span>
  );
}

function ProductCard({ product }: { product: Product }) {
  const trendColor = product.trend === "up" ? "text-[#00b88a]" : "text-[#ff5252]";

  return (
    <article
      dir="rtl"
      className="card-hover flex w-[326px] shrink-0 flex-col gap-2 rounded-[17px] border border-[#12183b] bg-ink-raised p-[11px] hover:border-brand-secondary/40"
    >
      <div className="relative flex h-[174px] items-center justify-center overflow-hidden rounded-[11px] bg-[#12183b]">
        <img
          src={product.image}
          alt={product.name}
          width={136}
          height={166}
          loading="lazy"
          className="h-[166px] w-[136px] object-cover"
        />

        {/* Physical sides, not logical ones: the rating carries `dir="ltr"`
            for its numeral, which would flip a logical `end-3` back to the
            right and drop it on top of the actions. */}
        <div dir="ltr" className="absolute left-3 top-3 flex items-center gap-1">
          <Star size={17} className="fill-amber text-amber" />
          <span className="text-[15px] text-[#e4e7fc]">{product.rating}</span>
        </div>

        {/* The two row actions the storefront card carries. Decorative here —
            this is a sample of the merchant's own view, not a live card. */}
        <div aria-hidden className="absolute right-3 top-3 flex flex-col gap-2">
          <span className="flex size-[38px] items-center justify-center rounded-[14px] text-brand-primary">
            <Pencil size={20} />
          </span>
          <span className="flex size-[38px] items-center justify-center rounded-[14px] text-[#ff5252]">
            <Trash2 size={20} />
          </span>
        </div>
      </div>

      <div className="flex flex-col gap-2 pb-2">
        {/* Badge on the right, store name to its left. */}
        <div className="flex items-center justify-start gap-2">
          <VendorBadge />
          <p className="text-xs font-bold text-frost">متجر ثري بوينت</p>
        </div>

        <div className="flex flex-wrap items-start justify-start gap-1">
          {product.tags.map((tag) => (
            <span
              key={tag}
              className="rounded-[15px] bg-brand-secondary/10 px-2 py-1 text-[12px] font-medium text-brand-secondary"
            >
              {tag}
            </span>
          ))}
        </div>

        <div className="flex flex-col gap-2">
          <p className="truncate text-[15px] font-medium text-frost">{product.name}</p>
          <p className="line-clamp-2 text-[11px] text-muted">{product.blurb}</p>
        </div>

        {/* The current price sits on the right and the discount on the left,
            and inside each the currency reads to the left of the figure. */}
        <div className="flex items-center justify-between px-2">
          <div className="flex flex-col items-start">
            <span className="text-[13px] font-medium text-[#31396e]">السعر</span>
            <span className="flex items-center gap-1">
              <span className="text-[17px] font-extrabold text-frost">{product.now}</span>
              <span className="text-[13px] font-medium text-muted">د.ع</span>
            </span>
          </div>

          <div className="flex flex-col items-start">
            <span dir="ltr" className={`flex items-center gap-0.5 text-[13px] font-medium ${trendColor}`}>
              15.4%
              <ArrowUpRight
                size={10}
                className={product.trend === "down" ? "rotate-90" : ""}
              />
            </span>
            <span className="flex items-center gap-1 text-[#e4e7fc]">
              <span className="text-[13px] font-bold">{product.was}</span>
              <span className="text-[11px]">د.ع</span>
            </span>
          </div>
        </div>
      </div>
    </article>
  );
}

/**
 * One scrolling rail of the four sample cards.
 *
 * `dir="ltr"` on the rail only: the animation translates negatively, which
 * under RTL would carry the right-anchored track out of view instead of
 * scrolling the next copy in. Each card re-declares `dir="rtl"` for its copy.
 */
function ProductDeck({ reverse }: { reverse?: boolean }) {
  return (
    <div dir="ltr" className="marquee-mask marquee-host w-full overflow-hidden">
      <div className={`marquee-track items-stretch gap-4 py-4 ${reverse ? "marquee-track-reverse" : ""}`}>
        {[0, 1].map((copy) => (
          <div key={copy} className="flex shrink-0 items-stretch gap-4">
            {PRODUCTS.map((product) => (
              <ProductCard key={`${copy}-${product.name}`} product={product} />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

/** The five-star flourish over the first heading — sizes taper outward. */
function StarFlourish() {
  return (
    <div aria-hidden className="flex items-end justify-end">
      {[22, 32, 42, 32, 22].map((size, i) => (
        <Star key={i} size={size} className="fill-amber text-amber" strokeWidth={1} />
      ))}
    </div>
  );
}

function ProductShowcase() {
  return (
    <section id="products" className="relative overflow-hidden py-20 lg:py-24">
      <div className="flex flex-col gap-16 lg:gap-20">
        {/* Best products — heading left, deck right (reversed out of RTL). */}
        <div className="flex flex-col items-center gap-10 lg:flex-row-reverse lg:items-center">
          <div
            data-reveal
            className="flex w-full shrink-0 flex-col items-start gap-3 px-4 sm:px-6 lg:w-[38%] lg:ps-0"
          >
            <StarFlourish />
            <h2 className="text-section-title text-right">
              أكـتشـف أفضــل الــمنتجات
            </h2>
            <p className="text-lede text-right">
              اكتشف أفضل المنتجات على منصتنا: جودة عالية، تقييمات موثوقة، وأسعار
              تنافسية بالدينار، كل ما يلزم لاتخاذ قرار شراء واثق.
            </p>
          </div>
          <div
            data-reveal
            className="min-w-0 lg:flex-1"
            style={{ "--reveal-delay": "140ms" } as React.CSSProperties}
          >
            <ProductDeck />
          </div>
        </div>

        {/* Offers — the mirror of the block above. */}
        <div className="flex flex-col items-center gap-10 lg:flex-row lg:items-center">
          <div
            data-reveal
            className="flex w-full shrink-0 flex-col items-start gap-3 px-4 sm:px-6 lg:w-[38%] lg:pe-0"
          >
            <img
              src="/images/landing/offers-flame.png"
              alt=""
              aria-hidden
              width={78}
              height={78}
              className="size-[78px]"
            />
            <h2 className="text-section-title text-right">
              العروض الحصرية والتخفيضات
            </h2>
            <p className="text-lede text-right">
              استفد من التخفيضات الحالية على منتجاتنا المختارة وأرسل إشعارات
              فورية لعملائك لتشجيعهم على الشراء الآن.
            </p>
          </div>
          <div
            data-reveal
            className="min-w-0 lg:flex-1"
            style={{ "--reveal-delay": "140ms" } as React.CSSProperties}
          >
            <ProductDeck reverse />
          </div>
        </div>
      </div>
    </section>
  );
}

export default ProductShowcase;

import SectionEyebrow from "./SectionEyebrow";

const PLAY_STORE =
  "https://play.google.com/store/apps/details?id=com.almashreq.mel";
const APP_STORE =
  "https://apps.apple.com/us/app/mel-platform/id6810126830";

function AppleMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden
      className={className}
      fill="currentColor"
    >
      <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
    </svg>
  );
}

function PlayMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden
      className={className}
      fill="currentColor"
    >
      <path d="M3 20.5V3.5c0-.59.34-1.11.84-1.35L13.69 12 3.84 21.85A1.48 1.48 0 0 1 3 20.5m13.81-5.38L6.05 21.34l8.49-8.49 2.27 2.27m3.35-4.31c.34.27.59.69.59 1.19s-.21.9-.55 1.18l-2.29 1.32-2.5-2.5 2.5-2.5 2.25 1.31M6.05 2.66l10.76 6.22-2.27 2.27L6.05 2.66z" />
    </svg>
  );
}

function StoreButton({
  href,
  label,
  store,
  icon,
  delay,
}: {
  href: string;
  label: string;
  store: string;
  icon: React.ReactNode;
  delay: number;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      data-reveal
      style={{ "--reveal-delay": `${delay}ms` } as React.CSSProperties}
      className="group flex min-w-[200px] items-center gap-3 rounded-[18px] border border-white/15 bg-white/[0.04] px-5 py-3.5 text-frost transition-colors hover:border-brand-primary/40 hover:bg-white/[0.07]"
    >
      {icon}
      <span className="flex flex-col text-right leading-tight">
        <span className="text-[11px] text-muted">{label}</span>
        <span className="text-base font-bold tracking-tight">{store}</span>
      </span>
    </a>
  );
}

/**
 * CTA that points merchants at the Mel apps on Google Play and the App Store.
 * Sits between the FAQ and contact blocks so the download path is clear before
 * someone reaches out for support.
 */
function AppDownloadSection() {
  return (
    <section
      id="download"
      className="relative overflow-hidden px-4 py-20 sm:px-6 lg:py-24"
    >
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="absolute start-1/2 top-0 h-[420px] w-[70%] -translate-x-1/2 rounded-full bg-[#2a1163]/35 blur-[150px]" />
        <div className="absolute -end-20 bottom-0 h-[360px] w-[45%] rounded-full bg-[#1d1052]/45 blur-[140px]" />
      </div>

      <div className="relative mx-auto flex max-w-[1600px] flex-col items-center gap-12 lg:flex-row-reverse lg:items-center lg:gap-10">
        <div className="flex w-full flex-col items-center gap-8 text-center lg:w-[48%] lg:items-start lg:text-right">
          <div className="flex flex-col items-center gap-6 lg:items-start">
            <div data-reveal>
              <SectionEyebrow align="start" as="p">حمّل التطبيق</SectionEyebrow>
            </div>
            <h2
              data-reveal
              className="text-display max-w-[22ch]"
              style={{ "--reveal-delay": "80ms" } as React.CSSProperties}
            >
              متجرك في جيبك
            </h2>
            <p
              data-reveal
              className="text-prose-lg max-w-[520px]"
              style={{ "--reveal-delay": "140ms" } as React.CSSProperties}
            >
              أدر منتجاتك وطلباتك وعملائك من هاتفك — تطبيق ميل متوفر الآن على
              الأندرويد والآيفون.
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3 lg:justify-start">
            <StoreButton
              href={APP_STORE}
              label="حمّله من"
              store="App Store"
              delay={200}
              icon={<AppleMark className="size-8 shrink-0" />}
            />
            <StoreButton
              href={PLAY_STORE}
              label="احصل عليه من"
              store="Google Play"
              delay={260}
              icon={<PlayMark className="size-8 shrink-0" />}
            />
          </div>
        </div>

        <div
          data-reveal="zoom"
          className="w-full max-w-[420px] shrink-0 lg:w-[42%] lg:max-w-[560px]"
          style={{ "--reveal-delay": "100ms" } as React.CSSProperties}
        >
          <picture>
            <source
              type="image/webp"
              srcSet="/images/landing/hero-phone-420.webp 420w, /images/landing/hero-phone.webp 840w"
              sizes="(min-width: 1024px) 560px, min(100vw - 2rem, 420px)"
            />
            <img
              src="/images/landing/hero-phone.png"
              alt=""
              aria-hidden
              width={658}
              height={781}
              loading="lazy"
              decoding="async"
              draggable={false}
              className="animate-drift pointer-events-none block h-auto w-full select-none"
            />
          </picture>
        </div>
      </div>
    </section>
  );
}

export default AppDownloadSection;

import { Facebook, Instagram, Linkedin, Tiktok, XTwitter, Youtube } from "../icons";
import { Link } from "react-router-dom";
import { SEO_TOPICS } from "../../seo/topics";

/** In RTL reading order — Instagram is the first one an Arabic reader meets. */
const SOCIALS = [
  { label: "إنستغرام", Icon: Instagram, href: "https://www.instagram.com/melappcom" },
  { label: "فيسبوك", Icon: Facebook, href: "https://www.facebook.com/melappcom" },
  { label: "تيكتوك", Icon: Tiktok, href: "https://www.tiktok.com/@melappcom" },
  { label: "إكس", Icon: XTwitter, href: "https://x.com/melappcom" },
  { label: "لينكدإن", Icon: Linkedin, href: "https://www.linkedin.com/company/melappcom/" },
  { label: "يوتيوب", Icon: Youtube, href: "https://www.youtube.com/@Melappcom" },
];

const LEGAL = [
  { label: "سياسة الخصوصية", to: "/privacy-policy" },
  { label: "حذف الحساب", to: "/delete-account" },
  { label: "شروط الاستخدام", to: null },
];

const FOOTER_PRODUCT = [
  { label: "الباقات", to: "/pricing" },
  { label: "الأدلة", to: "/guides" },
  { label: "تواصل معنا", to: "/contact" },
  { label: "من نحن", to: "/about" },
];

function SiteFooter() {
  return (
    <footer className="bg-gradient-to-b from-[#03010f] to-[#11054d] px-6 py-14 lg:px-24">
      <div className="mx-auto max-w-[1541px]">
        <div data-reveal className="flex flex-col items-center gap-4">
          <Link to="/" className="flex items-center gap-5" aria-label="ميل — الصفحة الرئيسية">
            <span className="flex size-[79px] shrink-0 items-center justify-center overflow-hidden rounded-[34px] bg-[linear-gradient(233.96deg,#b657ff_23.8%,#00bfff_76.3%)]">
              <img
                src="/images/landing/mel-mark.svg"
                alt=""
                aria-hidden
                width={79}
                height={79}
                className="size-[79px]"
              />
            </span>
            <span className="flex flex-col text-right">
              <span dir="ltr" className="text-[26px] font-extrabold leading-tight text-frost">
                mel.iq
              </span>
              <span className="text-[22px] leading-tight text-muted">
                نظام إدارة المتاجر
              </span>
            </span>
          </Link>

          <p className="max-w-[288px] text-center text-xs leading-[1.5] text-muted">
            منصة عراقية لإدارة المتاجر الإلكترونية ونقاط البيع، مدعومة بمساعد ذكي
            يتحدث لغتك.
          </p>

          <ul className="flex items-center gap-2">
            {SOCIALS.map(({ label, Icon, href }) => (
              <li key={label}>
                <a
                  href={href}
                  target="_blank"
                  rel="noreferrer noopener"
                  aria-label={label}
                  className="flex size-11 items-center justify-center rounded-xl bg-slate text-white transition-colors hover:bg-slate/70"
                >
                  <Icon size={16} />
                </a>
              </li>
            ))}
          </ul>
        </div>

        <div className="mt-10 grid gap-8 text-sm text-muted sm:grid-cols-2 lg:grid-cols-3">
          <div className="text-right">
            <p className="mb-3 font-bold text-frost">المنتج</p>
            <ul className="flex flex-col gap-2">
              {FOOTER_PRODUCT.map((item) => (
                <li key={item.to}>
                  <Link to={item.to} className="hover:text-frost">
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          <div className="text-right sm:col-span-1 lg:col-span-2">
            <p className="mb-3 font-bold text-frost">التجارة الإلكترونية في العراق</p>
            <ul className="flex flex-wrap gap-x-4 gap-y-2">
              {SEO_TOPICS.map((topic) => (
                <li key={topic.slug}>
                  <Link to={`/${topic.slug}`} className="hover:text-frost">
                    {topic.eyebrow}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-6 flex flex-col items-center gap-4 py-6 text-xs text-muted sm:flex-row sm:justify-between">
          <p>© 2026 mel.iq — جميع الحقوق محفوظة.</p>
          <ul className="flex flex-wrap items-center justify-center gap-5">
            {LEGAL.map((item) => (
              <li key={item.label}>
                {item.to ? (
                  <Link to={item.to} className="transition-colors hover:text-frost">
                    {item.label}
                  </Link>
                ) : (
                  item.label
                )}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </footer>
  );
}

export default SiteFooter;

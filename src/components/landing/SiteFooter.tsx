import { Facebook, Instagram, Linkedin, Twitter, Youtube } from "../icons";
import { Link } from "react-router-dom";

/** In RTL reading order — the frame runs YouTube through Instagram left to
 *  right, so Instagram is the first one an Arabic reader meets. */
const SOCIALS = [
  { label: "إنستغرام", Icon: Instagram, href: "https://www.instagram.com/meliq" },
  { label: "فيسبوك", Icon: Facebook, href: "https://www.facebook.com/meliq" },
  { label: "تويتر", Icon: Twitter, href: "https://twitter.com/meliq" },
  { label: "لينكدإن", Icon: Linkedin, href: "https://www.linkedin.com/company/meliq" },
  { label: "يوتيوب", Icon: Youtube, href: "https://www.youtube.com/@meliq" },
];

/**
 * The design renders these three as plain muted text, in the same style as
 * the copyright line beside them — no link affordance — which is just as well
 * because the app has no routes for them yet. They become <Link>s the day
 * those pages exist.
 */
const LEGAL = ["سياسة الخصوصية", "شروط الاستخدام", "ملفات الارتباط"];

function SiteFooter() {
  return (
    <footer className="bg-gradient-to-b from-[#03010f] to-[#11054d] px-6 py-14 lg:px-24">
      <div className="mx-auto max-w-[1541px]">
        <div data-reveal className="flex flex-col items-center gap-4">
          <Link to="/" className="flex items-center gap-5" aria-label="ميل — الصفحة الرئيسية">
            {/* The roundel's gradient is a brand constant (233.96°,
                #B657FF → #00BFFF) per the Figma component note, so it is
                painted here rather than baked into the exported mark. */}
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

        {/* Copyright on the right, the three notices on the left. */}
        <div className="mt-6 flex flex-col items-center gap-4 py-6 text-xs text-muted sm:flex-row sm:justify-between">
          <p>© 2026 mel.iq — جميع الحقوق محفوظة.</p>
          <ul className="flex flex-wrap items-center justify-center gap-5">
            {LEGAL.map((label) => (
              <li key={label}>{label}</li>
            ))}
          </ul>
        </div>
      </div>
    </footer>
  );
}

export default SiteFooter;

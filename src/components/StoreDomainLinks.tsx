import { ExternalLink, Loader2, Trash2 } from "@/components/icons";
import type { StoreDomainLink } from "@/api/endpoints/domain.endpoints";

type StoreDomainLinksProps = {
  links: StoreDomainLink[];
  onRemoveCustom?: () => void;
  removingCustom?: boolean;
};

/**
 * Open / switch between platform + custom storefront URLs, with cancel for a
 * linked custom domain. Driven by the backend `links[]` shape.
 */
export default function StoreDomainLinks({
  links,
  onRemoveCustom,
  removingCustom = false,
}: StoreDomainLinksProps) {
  if (!links.length) return null;

  const hasCustom = links.some((link) => link.type === "custom");

  return (
    <div className="space-y-3">
      <p className="text-sm font-semibold text-[#5b6178] dark:text-muted">
        روابط المتجر
      </p>
      <div className="space-y-2">
        {links.map((link) => (
          <div
            key={link.type}
            className={`flex items-center gap-2 rounded-2xl border p-3 ${
              link.primary
                ? "border-brand-indigo/40 bg-brand-indigo/8 dark:border-brand-primary/35 dark:bg-brand-primary/8"
                : "border-black/8 bg-black/[0.02] dark:border-white/10 dark:bg-white/[0.03]"
            }`}
          >
            <div className="min-w-0 flex-1 text-right">
              <p className="text-xs text-[#8a90a8] dark:text-dim">
                {link.label}
                {link.primary ? " · الرئيسي" : ""}
              </p>
              <code
                dir="ltr"
                className="block truncate text-sm font-bold text-[#0b1020] dark:text-frost"
                title={link.url}
              >
                {link.url.replace(/^https?:\/\//, "")}
              </code>
            </div>
            <a
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-10 shrink-0 items-center gap-1.5 rounded-xl border border-black/10 bg-white px-3 text-sm font-semibold text-[#0b1020] transition hover:bg-black/[0.04] dark:border-white/12 dark:bg-white/5 dark:text-frost dark:hover:bg-white/10"
            >
              <ExternalLink size={15} />
              فتح
            </a>
          </div>
        ))}
      </div>

      {hasCustom && onRemoveCustom && (
        <button
          type="button"
          onClick={onRemoveCustom}
          disabled={removingCustom}
          className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-2xl border border-red-300/70 bg-red-50 text-sm font-bold text-red-700 transition hover:bg-red-100 disabled:opacity-60 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300 dark:hover:bg-red-950/60"
        >
          {removingCustom ? (
            <Loader2 size={16} className="animate-spin" />
          ) : (
            <Trash2 size={16} />
          )}
          {removingCustom ? "جاري إلغاء النطاق المخصص..." : "إلغاء النطاق المخصص"}
        </button>
      )}
    </div>
  );
}

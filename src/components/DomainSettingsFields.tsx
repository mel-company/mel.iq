import DomainPriceBreakdown from "@/components/DomainPriceBreakdown";
import type { DomainType } from "@/hooks/useDomainCheck";
import type { DynadotSearchResult } from "@/api/endpoints/dynadot.endpoints";

type DomainSettingsFieldsProps = {
  domain: string;
  domainType: DomainType;
  domainChecked: boolean;
  domainAvailable: boolean | null;
  isCheckingDomain: boolean;
  dynadotResult: DynadotSearchResult | null;
  onDomainChange: (value: string) => void;
  onDomainTypeChange: (type: DomainType) => void;
  onCheck: () => void;
  variant?: "checkout" | "management";
  inputNamePrefix?: string;
  /** When parent already picks the path (subdomain / buy / owned). */
  hideTypePicker?: boolean;
};

/**
 * Two hosts, two languages.
 *
 * `checkout` is the wizard's own slate chrome. `management` is the store
 * management page, which is drawn in the brand's dark language — so the
 * border weight and the availability result live here too rather than being
 * hardcoded in the markup, where they could only ever suit one of the two.
 */
const VARIANT_STYLES = {
  checkout: {
    label: "text-slate-700 dark:text-slate-300",
    border: "border-2",
    radioSelected:
      "border-slate-900 dark:border-slate-100 bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-900",
    radioDefault:
      "border-slate-200 dark:border-slate-700 hover:border-slate-400 dark:hover:border-slate-500 bg-white dark:bg-slate-800",
    radioTitle: "text-slate-900 dark:text-slate-100",
    radioSubtitle: "text-slate-600 dark:text-slate-400",
    suffix:
      "bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700",
    input:
      "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-slate-900 dark:focus:ring-slate-300 placeholder:text-slate-400 dark:placeholder:text-slate-500",
    checkBtn:
      "bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-900 dark:text-slate-100",
    spinner: "border-slate-600",
    resultOk:
      "border-green-200 bg-green-50 text-green-800 dark:border-green-800 dark:bg-green-950 dark:text-green-200",
    resultWarn:
      "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-200",
  },
  management: {
    label: "text-[#5b6178] dark:text-muted",
    border: "border",
    radioSelected:
      "border-brand-indigo/55 bg-brand-indigo/8 dark:border-brand-primary/45 dark:bg-brand-primary/8",
    radioDefault:
      "border-black/8 bg-black/[0.02] hover:border-brand-indigo/30 dark:border-white/8 dark:bg-white/[0.02] dark:hover:border-white/20",
    radioTitle: "text-[#0b1020] dark:text-frost",
    radioSubtitle: "text-[#8a90a8] dark:text-dim",
    suffix:
      "bg-black/[0.04] text-[#5b6178] border-black/10 dark:bg-white/[0.06] dark:text-muted dark:border-field-line",
    input:
      "border-black/10 bg-black/[0.02] text-[#0b1020] placeholder:text-[#a9adbe] focus:ring-brand-indigo dark:border-field-line dark:bg-field dark:text-frost dark:placeholder:text-dim dark:focus:ring-brand-primary",
    checkBtn:
      "border border-black/10 bg-black/[0.03] text-[#0b1020] hover:bg-black/[0.06] dark:border-white/12 dark:bg-white/5 dark:text-frost dark:hover:bg-white/10",
    spinner: "border-brand-indigo dark:border-brand-primary",
    resultOk:
      "border-mint/30 bg-mint/10 text-[#00795a] dark:bg-mint/[0.08] dark:text-mint",
    resultWarn:
      "border-amber/35 bg-amber/10 text-[#a35400] dark:bg-amber/[0.08] dark:text-amber",
  },
} as const;

export default function DomainSettingsFields({
  domain,
  domainType,
  isCheckingDomain,
  dynadotResult,
  onDomainChange,
  onDomainTypeChange,
  onCheck,
  variant = "checkout",
  inputNamePrefix = "",
  hideTypePicker = false,
}: DomainSettingsFieldsProps) {
  const styles = VARIANT_STYLES[variant];
  const domainInputName = `${inputNamePrefix}domain`;
  const domainTypeInputName = `${inputNamePrefix}domainType`;

  return (
    <div>
      {!hideTypePicker && (
        <>
          <label
            className={`mb-4 block text-sm font-semibold ${styles.label}`}
          >
            نوع الدومين
          </label>
          <div className="mb-4 grid grid-cols-2 gap-4">
            <label
              className={`cursor-pointer rounded-2xl ${styles.border} p-4 transition-all duration-300 ${
                domainType === "subdomain"
                  ? styles.radioSelected
                  : styles.radioDefault
              }`}
            >
              <input
                type="radio"
                name={domainTypeInputName}
                value="subdomain"
                checked={domainType === "subdomain"}
                onChange={() => onDomainTypeChange("subdomain")}
                className="sr-only"
              />
              <div className="text-center">
                <div className={`mb-1 font-semibold ${styles.radioTitle}`}>
                  دومين فرعي
                </div>
                <div className={`text-xs ${styles.radioSubtitle}`}>
                  example.mel.iq
                </div>
              </div>
            </label>
            <label
              className={`cursor-pointer rounded-2xl ${styles.border} p-4 transition-all duration-300 ${
                domainType === "custom"
                  ? styles.radioSelected
                  : styles.radioDefault
              }`}
            >
              <input
                type="radio"
                name={domainTypeInputName}
                value="custom"
                checked={domainType === "custom"}
                onChange={() => onDomainTypeChange("custom")}
                className="sr-only"
              />
              <div className="text-center">
                <div className={`mb-1 font-semibold ${styles.radioTitle}`}>
                  دومين مخصص
                </div>
                <div className={`text-xs ${styles.radioSubtitle}`}>
                  example.com
                </div>
              </div>
            </label>
          </div>
        </>
      )}

      <div>
        <label className={`mb-2 block text-sm font-semibold ${styles.label}`}>
          {domainType === "subdomain"
            ? "اسم الدومين الفرعي"
            : "الدومين المخصص"}
        </label>
        <div className="flex">
          {domainType === "subdomain" ? (
            <>
              <span
                dir="ltr"
                className={`rounded-r-2xl ${styles.border} border-l-0 px-4 py-3 ${styles.suffix}`}
              >
                .mel.iq
              </span>
              <input
                type="text"
                name={domainInputName}
                value={domain}
                onChange={(e) => onDomainChange(e.target.value)}
                required
                className={`flex-1 rounded-l-2xl ${styles.border} border-r-0 px-4 py-2 outline-none transition-all duration-300 focus:border-transparent focus:ring-2 ${styles.input}`}
                placeholder="example"
              />
            </>
          ) : (
            <input
              type="text"
              name={domainInputName}
              value={domain}
              onChange={(e) => onDomainChange(e.target.value)}
              required
              className={`w-full rounded-2xl ${styles.border} px-4 py-2 outline-none transition-all duration-300 focus:border-transparent focus:ring-2 ${styles.input}`}
              placeholder="example.com"
            />
          )}
        </div>
      </div>

      <div className="mt-4">
        <button
          type="button"
          onClick={onCheck}
          disabled={!domain || isCheckingDomain}
          className={`w-full rounded-2xl px-4 py-2.5 text-sm font-bold transition-all duration-300 disabled:cursor-not-allowed disabled:opacity-50 ${styles.checkBtn}`}
        >
          {isCheckingDomain ? (
            <span className="flex items-center justify-center gap-2">
              <div
                className={`animate-spin rounded-full h-4 w-4 border-2 border-t-transparent ${styles.spinner}`}
              />
              جاري التحقق...
            </span>
          ) : (
            "التحقق من توفر الدومين"
          )}
        </button>
      </div>

      {domainType === "custom" && dynadotResult && (
        <div
          className={`mt-3 rounded-2xl ${styles.border} p-4 text-sm ${
            dynadotResult.available && dynadotResult.supported
              ? styles.resultOk
              : styles.resultWarn
          }`}
        >
          <p className="font-medium" dir="ltr">
            {dynadotResult.domain}
          </p>
          {!dynadotResult.supported && (
            <p className="mt-1">
              {dynadotResult.error ||
                "نوع الدومين غير مدعوم للتسجيل عبر Dynadot"}
            </p>
          )}
          {dynadotResult.available && (
            <DomainPriceBreakdown result={dynadotResult} />
          )}
          {dynadotResult.supported &&
            !dynadotResult.available &&
            dynadotResult.premium && (
              <p className="mt-1">دومين premium — التسجيل متاح لاحقاً</p>
            )}
          {dynadotResult.supported &&
            !dynadotResult.available &&
            !dynadotResult.premium && (
              <p className="mt-1">الدومين مسجّل مسبقاً وغير متاح</p>
            )}
        </div>
      )}
    </div>
  );
}

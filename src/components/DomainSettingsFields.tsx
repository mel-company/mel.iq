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
};

const VARIANT_STYLES = {
  checkout: {
    label: "text-slate-700 dark:text-slate-300",
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
  },
  management: {
    label: "text-gray-700 dark:text-gray-400",
    radioSelected:
      "border-black dark:border-white bg-gray-50 dark:bg-gray-900",
    radioDefault:
      "border-gray-200 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700 bg-white dark:bg-black",
    radioTitle: "text-black dark:text-white",
    radioSubtitle: "text-gray-600 dark:text-gray-400",
    suffix:
      "bg-gray-100 dark:bg-gray-900 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600",
    input:
      "border-gray-300 dark:border-gray-600 bg-white dark:bg-black text-black dark:text-white focus:ring-black dark:focus:ring-white placeholder:text-gray-400",
    checkBtn:
      "bg-gray-100 dark:bg-gray-900 hover:bg-gray-200 dark:hover:bg-gray-800 text-black dark:text-white border border-gray-300 dark:border-gray-700",
    spinner: "border-gray-600",
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
}: DomainSettingsFieldsProps) {
  const styles = VARIANT_STYLES[variant];
  const domainInputName = `${inputNamePrefix}domain`;
  const domainTypeInputName = `${inputNamePrefix}domainType`;

  return (
    <div>
      <label
        className={`block text-sm font-semibold mb-4 ${styles.label}`}
      >
        نوع الدومين
      </label>
      <div className="grid grid-cols-2 gap-4 mb-4">
        <label
          className={`p-4 border-2 rounded-lg cursor-pointer transition-all duration-300 ${
            domainType === "subdomain" ? styles.radioSelected : styles.radioDefault
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
            <div className={`font-semibold mb-1 ${styles.radioTitle}`}>
              دومين فرعي
            </div>
            <div className={`text-xs ${styles.radioSubtitle}`}>
              example.mel.iq
            </div>
          </div>
        </label>
        <label
          className={`p-4 border-2 rounded-lg cursor-pointer transition-all duration-300 ${
            domainType === "custom" ? styles.radioSelected : styles.radioDefault
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
            <div className={`font-semibold mb-1 ${styles.radioTitle}`}>
              دومين مخصص
            </div>
            <div className={`text-xs ${styles.radioSubtitle}`}>
              example.com
            </div>
          </div>
        </label>
      </div>

      <div>
        <label className={`block text-sm font-semibold mb-2 ${styles.label}`}>
          {domainType === "subdomain"
            ? "اسم الدومين الفرعي"
            : "الدومين المخصص"}
        </label>
        <div className="flex">
          {domainType === "subdomain" ? (
            <>
              <span
                dir="ltr"
                className={`px-4 py-3 border-2 border-l-0 rounded-r-xl ${styles.suffix}`}
              >
                .mel.iq
              </span>
              <input
                type="text"
                name={domainInputName}
                value={domain}
                onChange={(e) => onDomainChange(e.target.value)}
                required
                className={`flex-1 px-4 py-2 border-2 border-r-0 rounded-l-xl focus:ring-2 focus:border-transparent outline-none transition-all duration-300 ${styles.input}`}
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
              className={`w-full px-4 py-2 border-2 rounded-lg focus:ring-2 focus:border-transparent outline-none transition-all duration-300 ${styles.input}`}
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
          className={`w-full py-2 px-4 rounded-lg font-medium text-sm transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed ${styles.checkBtn}`}
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
          className={`mt-3 rounded-lg border-2 p-3 text-sm ${
            dynadotResult.available && dynadotResult.supported
              ? "border-green-200 bg-green-50 text-green-800 dark:border-green-800 dark:bg-green-950 dark:text-green-200"
              : "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-200"
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

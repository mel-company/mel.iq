import type { DynadotSearchResult } from "@/api/endpoints/dynadot.endpoints";
import {
  formatUsd,
  getDomainPurchasePricing,
} from "@/utils/domainPricing";

type DomainPriceBreakdownProps = {
  result: DynadotSearchResult;
};

export default function DomainPriceBreakdown({
  result,
}: DomainPriceBreakdownProps) {
  const pricing = getDomainPurchasePricing(result.price);

  if (!result.supported) {
    return (
      <p className="mt-1">
        {result.error || "نوع الدومين غير مدعوم للتسجيل عبر Dynadot"}
      </p>
    );
  }

  if (!result.available) {
    return (
      <p className="mt-1">
        {result.premium
          ? "دومين premium — التسجيل متاح لاحقاً"
          : "الدومين مسجّل مسبقاً وغير متاح"}
      </p>
    );
  }

  if (!pricing) {
    return (
      <p className="mt-1 text-amber-700 dark:text-amber-300">
        الدومين متاح — تعذر قراءة السعر. حاول التحقق مرة أخرى.
      </p>
    );
  }

  return (
    <div className="mt-3 space-y-2 text-sm">
      <div className="flex items-center justify-between gap-3">
        <span className="text-gray-600 dark:text-gray-300">تسجيل الدومين</span>
        <span className="font-medium" dir="ltr">
          {formatUsd(pricing.registrationUsd)}
        </span>
      </div>
      <div className="flex items-center justify-between gap-3">
        <span className="text-gray-600 dark:text-gray-300">رسوم MEL</span>
        <span className="font-medium" dir="ltr">
          {formatUsd(pricing.markupUsd)}
        </span>
      </div>
      <div className="flex items-center justify-between gap-3 border-t border-green-200 pt-2 dark:border-green-800">
        <span className="font-semibold">المجموع (زين كاش)</span>
        <span className="text-base font-bold" dir="ltr">
          {formatUsd(pricing.totalUsd)}
        </span>
      </div>
      {pricing.renewalUsd != null && (
        <p className="text-xs text-gray-500 dark:text-gray-400">
          تجديد سنوي لاحقاً: {formatUsd(pricing.renewalUsd)}
        </p>
      )}
      <p className="text-xs text-gray-500 dark:text-gray-400">
        يُحوَّل المبلغ للدينار العراقي عند الدفع عبر زين كاش
      </p>
    </div>
  );
}

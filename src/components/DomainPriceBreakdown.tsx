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
      <p className="mt-1 opacity-80">
        الدومين متاح — تعذر قراءة السعر. حاول التحقق مرة أخرى.
      </p>
    );
  }

  return (
    <div className="mt-3 space-y-2 text-sm">
      <div className="flex items-center justify-between gap-3">
        <span className="opacity-75">تسجيل الدومين</span>
        <span className="font-medium" dir="ltr">
          {formatUsd(pricing.registrationUsd)}
        </span>
      </div>
      <div className="flex items-center justify-between gap-3">
        <span className="opacity-75">رسوم MEL</span>
        <span className="font-medium" dir="ltr">
          {formatUsd(pricing.markupUsd)}
        </span>
      </div>
      <div className="flex items-center justify-between gap-3 border-t border-black/10 pt-2.5 dark:border-white/15">
        <span className="font-semibold">المجموع</span>
        <span className="text-base font-bold" dir="ltr">
          {formatUsd(pricing.totalUsd)}
        </span>
      </div>
      {pricing.renewalUsd != null && (
        <p className="text-xs opacity-65">
          تجديد سنوي لاحقاً: {formatUsd(pricing.renewalUsd)}
        </p>
      )}
      <p className="text-xs opacity-65">
        يُحوَّل المبلغ للدينار العراقي عند الدفع
      </p>
    </div>
  );
}

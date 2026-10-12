import type { SubscriptionQuote } from "@/api/endpoints/platform-payment.endpoint";

/**
 * Turning a server quote into the two things a merchant needs to read: what
 * they owe now, and why it is not the number on the price card.
 *
 * Both surfaces that charge printed `plan.monthly_price` and the server then
 * applied the intro ladder — one free month, then six at half price — so a
 * merchant inside the offer was quoted 39,000 and charged 19,500. The ladder is
 * state no client can see, so the amount has to come from the quote; these only
 * render it.
 */

/** `1,250,000 د.ع` with Latin digits, matching the rest of this app. */
function formatCurrency(value: number | null | undefined, fallback = "—"): string {
  if (value == null || Number.isNaN(Number(value))) return fallback;
  return `${Number(value).toLocaleString("en-US", {
    maximumFractionDigits: 2,
  })} د.ع`;
}

/** What is due now. */
export function quoteDue(quote: SubscriptionQuote | undefined): string {
  if (!quote) return "—";
  return quote.amount > 0 ? formatCurrency(quote.amount) : "مجاناً";
}

const monthsLabel = (n: number) => (n === 1 ? "شهر" : `${n} أشهر`);

/**
 * Why that is the amount, in one line, or `null` when there is nothing to
 * explain — a merchant past the promo is paying list price and does not need to
 * be told a story about it.
 */
export function quoteExplanation(
  quote: SubscriptionQuote | undefined,
): string | null {
  if (!quote) return null;
  const { freeMonths, discountMonths, fullMonths, discountedMonthlyPrice } =
    quote.breakdown;

  const parts: string[] = [];
  if (freeMonths > 0) parts.push(`${monthsLabel(freeMonths)} مجاناً`);
  if (discountMonths > 0) {
    parts.push(
      `${monthsLabel(discountMonths)} بخصم ${quote.promo.discountPercent}% ` +
        `(${formatCurrency(discountedMonthlyPrice)} للشهر)`,
    );
  }
  if (fullMonths > 0 && parts.length > 0) {
    parts.push(`${monthsLabel(fullMonths)} بالسعر الكامل`);
  }

  return parts.length > 0 ? parts.join(" + ") : null;
}

/** The next charge date, in Arabic with Latin digits. */
export function quoteNextCharge(
  quote: SubscriptionQuote | undefined,
): string | null {
  if (!quote?.periodEndsAt) return null;
  const at = new Date(quote.periodEndsAt);
  if (Number.isNaN(at.getTime())) return null;
  return at.toLocaleDateString("ar-IQ-u-nu-latn", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

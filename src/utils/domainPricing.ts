import type { DynadotDomainPrice } from "@/api/endpoints/dynadot.endpoints";

/** MEL service fee on top of Dynadot registration price (USD). */
export const DOMAIN_MARKUP_USD = 5;

export type DomainPurchasePricing = {
  registrationUsd: number;
  markupUsd: number;
  totalUsd: number;
  renewalUsd: number | null;
  currency: "USD";
};

export function parseRegistrationUsd(
  price?: DynadotDomainPrice,
): number | null {
  if (price == null) return null;
  if (typeof price === "number" && Number.isFinite(price)) return price;
  if (typeof price === "string") {
    const labeled = price.match(/Registration Price:\s*([\d.]+)/i);
    if (labeled) return parseFloat(labeled[1]);
    const simple = price.match(/^([\d.]+)/);
    if (simple) return parseFloat(simple[1]);
    return null;
  }
  if (typeof price.registration === "number") return price.registration;
  return null;
}

export function parseRenewalUsd(price?: DynadotDomainPrice): number | null {
  if (price == null || typeof price === "number" || typeof price === "string") {
    if (typeof price === "string") {
      const labeled = price.match(/Renewal\s*(?:price)?:\s*([\d.]+)/i);
      if (labeled) return parseFloat(labeled[1]);
    }
    return null;
  }
  if (typeof price.renewal === "number") return price.renewal;
  return null;
}

export function getDomainPurchasePricing(
  price?: DynadotDomainPrice,
): DomainPurchasePricing | null {
  const registrationUsd = parseRegistrationUsd(price);
  if (registrationUsd == null || !Number.isFinite(registrationUsd)) {
    return null;
  }

  return {
    registrationUsd,
    markupUsd: DOMAIN_MARKUP_USD,
    totalUsd: registrationUsd + DOMAIN_MARKUP_USD,
    renewalUsd: parseRenewalUsd(price),
    currency: "USD",
  };
}

export function formatUsd(amount: number): string {
  return `$${amount.toFixed(2)}`;
}

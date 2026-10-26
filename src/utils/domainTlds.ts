/** TLDs offered in the buy-domain picker (Dynadot-friendly set). */
export const DOMAIN_TLDS = [
  ".com",
  ".org",
  ".io",
  ".net",
  ".co",
  ".shop",
  ".store",
  ".online",
  ".app",
  ".dev",
  ".me",
  ".info",
  ".xyz",
] as const;

export type DomainTld = (typeof DOMAIN_TLDS)[number];

export const DEFAULT_DOMAIN_TLD: DomainTld = ".com";

/** Slug only — letters, digits, hyphen. */
export function cleanDomainLabel(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .split("/")[0]
    .split(".")[0]
    .replace(/[^a-z0-9-]/g, "");
}

export function splitCustomDomain(value: string): {
  name: string;
  tld: DomainTld;
} {
  const clean = value
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .split("/")[0];

  if (!clean) {
    return { name: "", tld: DEFAULT_DOMAIN_TLD };
  }

  for (const tld of DOMAIN_TLDS) {
    if (clean === tld.slice(1)) {
      return { name: "", tld };
    }
    if (clean.endsWith(tld)) {
      return {
        name: cleanDomainLabel(clean.slice(0, -tld.length)),
        tld,
      };
    }
  }

  const lastDot = clean.lastIndexOf(".");
  if (lastDot > 0) {
    return {
      name: cleanDomainLabel(clean.slice(0, lastDot)),
      tld: DEFAULT_DOMAIN_TLD,
    };
  }

  return { name: cleanDomainLabel(clean), tld: DEFAULT_DOMAIN_TLD };
}

export function joinCustomDomain(name: string, tld: string): string {
  const label = cleanDomainLabel(name);
  if (!label) return "";
  const suffix = tld.startsWith(".") ? tld : `.${tld}`;
  return `${label}${suffix}`;
}

/**
 * A first store link for the merchant to accept or change, so the store step
 * opens on something that already works instead of an empty field.
 *
 * The rules are the server's (`isValidDomain`): a letter first, then letters,
 * digits and hyphens, no trailing hyphen. Arabic names have no Latin spelling
 * we can guess, so they are skipped and the email or phone carries it.
 */

const VALID = /^[a-z][a-z0-9-]*[a-z0-9]$/;
const MAX_LENGTH = 30;

/** What the merchant may type in the link field: lower-case Latin, digits, hyphens. */
export function cleanSubdomainInput(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9-]/g, "");
}

/** `Ali.Hassan_99` → `ali-hassan-99`; `""` when nothing Latin is left. */
export function toSubdomain(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^[^a-z]+/, "")
    .slice(0, MAX_LENGTH)
    .replace(/-+$/, "");
}

export function isValidSubdomain(value: string): boolean {
  return value.length >= 3 && VALID.test(value);
}

const twoDigits = () => String(Math.floor(10 + Math.random() * 90));

/** Ordered guesses, best first; the caller keeps the first one that is free. */
export function subdomainCandidates(source: {
  storeName?: string;
  email?: string;
  phone?: string;
}): string[] {
  const bases = [
    toSubdomain(source.storeName || ""),
    toSubdomain((source.email || "").split("@")[0]),
  ].filter(isValidSubdomain);

  const out: string[] = [];
  for (const base of bases) {
    out.push(base, `${base}-store`, `${base}${twoDigits()}`);
  }
  const lastDigits = (source.phone || "").replace(/\D/g, "").slice(-4);
  if (lastDigits.length === 4) out.push(`store${lastDigits}`);
  out.push(`store${twoDigits()}${twoDigits()}`, `store${twoDigits()}${twoDigits()}${twoDigits()}`);

  return [...new Set(out)].filter(isValidSubdomain);
}

/**
 * Where a store lives on the public internet.
 *
 * These were private to the dashboard page until the navbar needed the same
 * answer; a second copy would have been a second thing to keep in step with
 * the API's `storeUrl`.
 */

/** Only the fields the resolvers read — any store-shaped object will do. */
export type StoreLike = {
  domain?: string | null;
  customDomain?: string | null;
  /** Public storefront URL from the API, e.g. https://mystore.mel.iq */
  storeUrl?: string | null;
  is_deleted?: boolean;
};

/** `hasan` from `hasan`, `hasan.mel.iq`, `dash.hasan.mel.iq` or a full URL. */
const toSlug = (domain?: string | null): string | undefined =>
  domain
    ?.trim()
    .replace(/^https?:\/\//, "")
    .replace(/^dash\./, "")
    .replace(/\.mel\.iq$/i, "")
    .split("/")[0]
    ?.split(".")[0];

/** Prefer API storeUrl, then customDomain, then platform slug. */
export const resolveStorefrontUrl = (store: StoreLike): string | null => {
  if (store.storeUrl?.trim()) return store.storeUrl.trim();
  if (store.customDomain?.trim()) {
    const host = store.customDomain.trim().replace(/^https?:\/\//, "");
    return `https://${host}`;
  }
  const slug = toSlug(store.domain);
  return slug ? `https://${slug}.mel.iq` : null;
};

/** https://dash.{slug}.mel.iq */
export const resolveDashboardUrl = (store: StoreLike): string | null => {
  const slug = toSlug(store.domain);
  return slug ? `https://dash.${slug}.mel.iq` : null;
};

/** The API returns lists under a few different keys depending on the route. */
export const normalizeApiResponse = <T,>(data: unknown): T[] => {
  if (!data) return [];
  const source = data as Record<string, unknown>;
  const normalized =
    source?.data ?? source?.stores ?? source?.subscriptions ?? data;
  return Array.isArray(normalized) ? (normalized as T[]) : [];
};

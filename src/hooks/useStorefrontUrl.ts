import { useMemo } from "react";
import { useAuth } from "../contexts/AuthContext";
import { useFetchStores } from "../api/wrappers/store.wrappers";
import { normalizeApiResponse, resolveStorefrontUrl, type StoreLike } from "../utils/storeUrls";

/**
 * The signed-in merchant's own storefront, or null when there isn't one.
 *
 * Both navbars offer a "visit my store" link, and both need the same answer;
 * the query is keyed the same way the dashboard keys it, so on `/dashboard`
 * this rides the existing cache instead of issuing a second request.
 *
 * Owners with several stores get their first one — switching between them is
 * what the dashboard is for.
 */
export function useStorefrontUrl(): string | null {
  const { user } = useAuth();
  const { data: storesData } = useFetchStores(undefined, Boolean(user));

  return useMemo(() => {
    if (!user) return null;
    const stores = normalizeApiResponse<StoreLike>(storesData).filter(
      (store) => !store.is_deleted,
    );
    for (const store of stores) {
      const url = resolveStorefrontUrl(store);
      if (url) return url;
    }
    return null;
  }, [user, storesData]);
}

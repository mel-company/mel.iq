import { useMemo } from "react";
import { useAuth } from "../contexts/AuthContext";
import { useFetchStores } from "../api/wrappers/store.wrappers";
import { normalizeApiResponse, type StoreLike } from "../utils/storeUrls";

/**
 * Whether the signed-in merchant owns a store yet.
 *
 * `hasStore` stays false until the list has actually arrived, so a nav that
 * hides the dashboard link for store-less accounts does not flash it on the
 * way in. Keyed the same as `useStorefrontUrl`, so both ride one request.
 */
export function useHasStore(): { hasStore: boolean; loading: boolean } {
  const { user } = useAuth();
  const { data: storesData, isLoading } = useFetchStores(
    undefined,
    Boolean(user),
  );

  const hasStore = useMemo(
    () =>
      Boolean(user) &&
      normalizeApiResponse<StoreLike>(storesData).some(
        (store) => !store.is_deleted,
      ),
    [user, storesData],
  );

  return { hasStore, loading: Boolean(user) && isLoading };
}

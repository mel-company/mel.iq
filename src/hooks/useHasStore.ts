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
  const { data: storesData, isLoading, isError } = useFetchStores(
    undefined,
    Boolean(user),
  );

  // When the list cannot be read, assume a store: the dashboard copes with
  // either answer, while hiding it from an owner would strand them.
  const hasStore = useMemo(
    () =>
      Boolean(user) &&
      (isError ||
        normalizeApiResponse<StoreLike>(storesData).some(
          (store) => !store.is_deleted,
        )),
    [user, storesData, isError],
  );

  return { hasStore, loading: Boolean(user) && isLoading };
}

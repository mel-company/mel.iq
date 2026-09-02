import { useMutation, useQueryClient } from "@tanstack/react-query";
import { domainAPI } from "../endpoints/domain.endpoints";
import { storeKeys } from "./store.wrappers";

export const useSetCustomDomain = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params: { domain: string }) => domainAPI.setCustomDomain(params),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: storeKeys.all });
    },
  });
};

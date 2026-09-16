import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  domainAPI,
  type DomainConnectDiscovery,
  type DomainConnectStartResult,
} from "../endpoints/domain.endpoints";
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

/** Path 3: discover connection mode for an owned domain (check only). */
export const useDiscoverDomainConnect = () => {
  return useMutation<DomainConnectDiscovery, Error, { domain: string }>({
    mutationFn: ({ domain }) => domainAPI.discoverConnect(domain),
  });
};

/** Path 3: get signed applyUrl then open provider UX. */
export const useStartDomainConnect = () => {
  return useMutation<DomainConnectStartResult, Error, { domain: string }>({
    mutationFn: ({ domain }) => domainAPI.startConnect(domain),
  });
};

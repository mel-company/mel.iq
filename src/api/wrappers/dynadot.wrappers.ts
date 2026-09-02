import { useMutation } from "@tanstack/react-query";
import { dynadotAPI, type DynadotSearchResult } from "../endpoints/dynadot.endpoints";

export const useDynadotSearch = () => {
  return useMutation<DynadotSearchResult[], Error, { domain: string }>({
    mutationFn: ({ domain }) => dynadotAPI.search(domain),
  });
};

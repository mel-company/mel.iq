import axiosInstance from "@/utils/AxiosInstance";

export type DynadotDomainPrice =
  | string
  | number
  | {
      registration?: number;
      renewal?: number;
      currency?: string;
    };

export type DynadotSearchResult = {
  domain: string;
  available: boolean;
  supported: boolean;
  premium: boolean;
  price?: DynadotDomainPrice;
  error?: string;
};

export function formatDynadotPrice(price?: DynadotDomainPrice): string | null {
  if (price == null) return null;
  if (typeof price === "string" || typeof price === "number") {
    return String(price);
  }

  const parts: string[] = [];
  if (price.registration != null) {
    parts.push(
      `التسجيل: ${price.registration}${price.currency ? ` ${price.currency}` : ""}`,
    );
  }
  if (price.renewal != null) {
    parts.push(
      `التجديد: ${price.renewal}${price.currency ? ` ${price.currency}` : ""}`,
    );
  }
  return parts.length ? parts.join(" · ") : null;
}

export const dynadotAPI = {
  search: async (domain: string): Promise<DynadotSearchResult[]> => {
    const { data } = await axiosInstance.post<DynadotSearchResult[]>(
      "/dynadot/search",
      { domain },
    );
    return data;
  },
};

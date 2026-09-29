import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";
import StoreManagement from "./StoreManagement";
import { storeKeys } from "@/api/wrappers/store.wrappers";
import { subscriptionKeys } from "@/api/wrappers/subscription.wrapper";
import { planKeys } from "@/api/wrappers/plan.wrappers";

/**
 * The store management page with its three queries answered from memory.
 *
 * It exists because the real route is behind a merchant session, so the only
 * way to look at the screen was to have a store — which makes every change to
 * its layout unverifiable for anyone who does not. Reached at
 * `/__dev/store/dev-store/manage`; the id in the path is what the seeded
 * subscription query is keyed by, so it has to stay `dev-store`.
 *
 * Nothing here is wired to the API. Submitting a form in this preview fires a
 * real mutation and will fail unauthenticated, which is the intended limit:
 * this is for looking at the page, not for exercising it.
 */
const STORE_ID = "dev-store";

const daysFromNow = (days: number) =>
  new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();

const store = {
  id: STORE_ID,
  name: "سيول سكين",
  domain: "seoul-skin",
  customDomain: null,
  storeUrl: "https://seoul-skin.mel.iq",
  logo: null,
  instagram: "https://instagram.com/seoulskin",
  facebook: "",
  tiktok: "",
  x: "",
  is_deleted: false,
};

const subscription = {
  id: "sub-dev",
  storeId: STORE_ID,
  status: "ACTIVE",
  start_at: daysFromNow(-62),
  end_at: daysFromNow(28),
  planId: "plan-pro",
  plan: {
    id: "plan-pro",
    name: "الخطة المتقدمة",
    is_free: false,
    monthly_price: 25000,
  },
};

const plans = [
  {
    id: "plan-start",
    name: "البداية",
    description: "لمتجر يبدأ أول مبيعاته",
    monthly_price: 10000,
    enabled: true,
  },
  {
    id: "plan-pro",
    name: "الخطة المتقدمة",
    description: "لمتجر ينمو ويحتاج أدوات أكثر",
    monthly_price: 25000,
    enabled: true,
    most_popular: true,
  },
  {
    id: "plan-max",
    name: "الاحترافية",
    description: "لمتجر بحجم مبيعات كبير",
    monthly_price: 60000,
    enabled: true,
  },
];

export default function DevManagePreview() {
  const [client] = useState(() => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false, staleTime: Infinity } },
    });
    queryClient.setQueryData(storeKeys.list(undefined), [store]);
    queryClient.setQueryData(subscriptionKeys.list({ storeId: STORE_ID }), [
      subscription,
    ]);
    queryClient.setQueryData(planKeys.lists(), plans);
    return queryClient;
  });

  // No `.dark` wrapper: the management page pins its own theme, so what this
  // preview shows is what the route shows.
  return (
    <QueryClientProvider client={client}>
      <StoreManagement />
    </QueryClientProvider>
  );
}

export const DOMAIN_CONNECT_PENDING_KEY = "mel_domain_connect_pending";

export type DomainConnectPending = {
  domain: string;
  storeId: string;
  returnTo: string;
};

export function saveDomainConnectPending(pending: DomainConnectPending) {
  sessionStorage.setItem(DOMAIN_CONNECT_PENDING_KEY, JSON.stringify(pending));
}

export function readDomainConnectPending(): DomainConnectPending | null {
  try {
    const raw = sessionStorage.getItem(DOMAIN_CONNECT_PENDING_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as DomainConnectPending;
    if (!parsed?.domain || !parsed?.storeId) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function clearDomainConnectPending() {
  sessionStorage.removeItem(DOMAIN_CONNECT_PENDING_KEY);
}
